import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("a learner unlocks a course's completion check by finishing its lessons, and passes it", async ({ browser }) => {
  const admin = await browser.newPage();
  await signIn(admin, "admin@example.test");
  await admin.goto("/admin/courses");
  const title = `E2E check ${Date.now()}`;
  await admin.fill("form[data-test=create-course] input[name=title]", title);
  await admin.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await admin.click("form[data-test=create-course] button[type=submit]");
  await expect(admin.getByRole("heading", { name: title })).toBeVisible();
  const courseUrl = admin.url().split("?")[0];
  await admin.fill("form[data-test=add-lesson] input[name=title]", "Only lesson");
  await admin.fill("form[data-test=add-lesson] textarea[name=body]", "Read **this**.\n\n- point one\n- point two");
  await admin.click("form[data-test=add-lesson] button[type=submit]");
  await admin.click("form[data-test=publish] button[type=submit]");
  await expect(admin.getByText("Status: Published")).toBeVisible();

  // A one-time assessment linked to the course, published but assigned to nobody.
  await admin.goto("/admin/assessments");
  await admin.fill("form[data-test=create-assessment] input[name=title]", `${title} check`);
  await admin.selectOption("form[data-test=create-assessment] select[name=subjectId]", { label: "E2E Subject" });
  await admin.selectOption("form[data-test=create-assessment] select[name=courseId]", { label: `E2E Subject: ${title}` });
  await admin.click("form[data-test=create-assessment] button[type=submit]");
  await admin.fill("form[data-test=add-question] input[name=text]", "Pick B for the check");
  await admin.fill("form[data-test=add-question] input[name=options]", "A|B");
  await admin.fill("form[data-test=add-question] input[name=correct]", "2");
  await admin.click("form[data-test=add-question] button[type=submit]");
  await expect(admin.getByRole("heading", { name: "Questions (1)" })).toBeVisible();
  await admin.click("form[data-test=publish-assessment] button[type=submit]");
  await expect(admin.getByRole("button", { name: "Unpublish" })).toBeVisible();

  const learner = await browser.newPage();
  await signIn(learner, "employee@example.test");
  await learner.goto(courseUrl.replace("/admin/courses/", "/learn/courses/"));
  await expect(learner.locator(".lesson-text strong")).toHaveText("this");
  await expect(learner.getByText("Finish every lesson above to unlock the completion check")).toBeVisible();
  await learner.getByRole("button", { name: "Mark complete" }).click();
  await learner.getByRole("button", { name: "Take the completion check" }).click();
  await expect(learner.getByText("Pick B for the check")).toBeVisible();
  await learner.getByLabel("B", { exact: true }).check();
  await learner.click("button:has-text('Submit answers')");
  await expect(learner.getByText("Score: 100%")).toBeVisible();
  await learner.goto(courseUrl.replace("/admin/courses/", "/learn/courses/"));
  await expect(learner.getByText("You passed the completion check with 100%.")).toBeVisible();
});
