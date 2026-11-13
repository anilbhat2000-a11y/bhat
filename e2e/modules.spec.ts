import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("an admin builds a course with three modules; learners see them; archiving retires it", async ({ browser }) => {
  const admin = await browser.newPage();
  await signIn(admin, "admin@example.test");
  await admin.goto("/admin/courses");
  const title = `E2E modules ${Date.now()}`;
  await admin.fill("form[data-test=create-course] input[name=title]", title);
  await admin.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await admin.click("form[data-test=create-course] button[type=submit]");
  await expect(admin.getByRole("heading", { name: title })).toBeVisible();
  const courseUrl = admin.url().split("?")[0];

  const modules = [["Getting started", "15"], ["Core skills", "45"], ["Review", "10"]];
  for (const [i, [name, minutes]] of modules.entries()) {
    await admin.fill("form[data-test=add-module] input[name=title]", name);
    await admin.fill("form[data-test=add-module] input[name=estimatedMinutes]", minutes);
    await admin.click("form[data-test=add-module] button[type=submit]");
    await expect(admin.getByRole("button", { name: /^Remove module / })).toHaveCount(i + 1);
  }

  // Added out of order on purpose: placing a lesson in a module moves it into that group.
  const lessons = [["Wrap-up quiz prep", "3. Review"], ["Welcome", "1. Getting started"], ["Main topic", "2. Core skills"]];
  for (const [i, [lesson, module]] of lessons.entries()) {
    await admin.fill("form[data-test=add-lesson] input[name=title]", lesson);
    await admin.fill("form[data-test=add-lesson] textarea[name=body]", `${lesson} text.`);
    await admin.selectOption("form[data-test=add-lesson] select[name=moduleId]", { label: module });
    await admin.click("form[data-test=add-lesson] button[type=submit]");
    await expect(admin.locator("form[data-test=assign-modules] select")).toHaveCount(i + 1);
  }
  await admin.click("form[data-test=publish] button[type=submit]");
  await expect(admin.getByText("Status: Published")).toBeVisible();

  const learner = await browser.newPage();
  await signIn(learner, "employee@example.test");
  await learner.goto(courseUrl.replace("/admin/courses/", "/learn/courses/"));
  const moduleHeadings = learner.getByRole("heading", { level: 2 });
  await expect(moduleHeadings).toHaveText([/Module 1: Getting started/, /Module 2: Core skills/, /Module 3: Review/]);
  await expect(learner.getByRole("heading", { level: 3 })).toHaveText(["Welcome", "Main topic", "Wrap-up quiz prep"]);
  await expect(learner.getByText("about 1 h 10 min in total")).toBeVisible();

  await admin.goto(courseUrl);
  await admin.getByRole("button", { name: "Archive (retire) this course" }).click();
  await expect(admin.getByText("Status: Archived")).toBeVisible();

  // The learner never started it, so it is gone for them. Pages stream, so the not-found
  // page arrives with status 200; check what the learner sees instead.
  await learner.goto(courseUrl.replace("/admin/courses/", "/learn/courses/"));
  await expect(learner.getByText("This page could not be found")).toBeVisible();
  await expect(learner.getByRole("heading", { name: title })).toHaveCount(0);
  await learner.goto("/learn/catalogue");
  await expect(learner.getByText(title)).toHaveCount(0);
});
