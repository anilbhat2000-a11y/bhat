import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD, runDb } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("assignments, announcements, Q&A, feedback and search work end to end", async ({ browser }) => {
  const admin = await browser.newPage();
  await signIn(admin, "admin@example.test");

  // A published one-lesson course.
  await admin.goto("/admin/courses");
  const title = `E2E community ${Date.now()}`;
  await admin.fill("form[data-test=create-course] input[name=title]", title);
  await admin.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await admin.click("form[data-test=create-course] button[type=submit]");
  await expect(admin.getByRole("heading", { name: title })).toBeVisible();
  await admin.fill("form[data-test=add-lesson] input[name=title]", "Only lesson");
  await admin.fill("form[data-test=add-lesson] textarea[name=body]", "Read me.");
  await admin.click("form[data-test=add-lesson] button[type=submit]");
  await admin.click("form[data-test=publish] button[type=submit]");
  await expect(admin.getByText("Status: Published")).toBeVisible();
  const courseId = runDb(["course-id", title]);

  // An announcement for everyone.
  await admin.goto("/admin/announcements");
  const headline = `E2E news ${Date.now()}`;
  await admin.fill("form[data-test=announce] input[name=title]", headline);
  await admin.fill("form[data-test=announce] textarea[name=body]", "A new course is available.");
  await admin.click("form[data-test=announce] button[type=submit]");
  await expect(admin.getByRole("status")).toHaveText("Announcement posted");

  // The manager makes the course mandatory for their team member.
  const manager = await browser.newPage();
  await signIn(manager, "manager@example.test");
  await manager.goto("/manager/team");
  await manager.getByRole("link", { name: "Test Employee" }).click();
  await manager.locator("form[data-test=assign-member] select[name=courseId]").selectOption({ label: `E2E Subject: ${title} (basic)` });
  await manager.locator("form[data-test=assign-member] input[name=dueDate]").fill("2099-12-31");
  await manager.locator("form[data-test=assign-member] button[type=submit]").click();
  await expect(manager.getByRole("status")).toHaveText("Course assigned");
  await expect(manager.getByText(`${title} (E2E Subject): Not started, due 2099-12-31`)).toBeVisible();

  // The employee sees both, finishes the course, asks a question, and gives feedback.
  const learner = await browser.newPage();
  await signIn(learner, "employee@example.test");
  await expect(learner.getByText(headline)).toBeVisible();
  const assigned = learner.locator("li", { hasText: title }).first();
  await expect(assigned).toContainText("Not started");
  await expect(assigned).toContainText("due in");
  await assigned.getByRole("link", { name: title }).click();
  await learner.getByRole("button", { name: "Mark complete" }).click();
  await expect(learner.getByRole("heading", { name: "Course feedback" })).toBeVisible();
  await learner.getByLabel("4", { exact: true }).check();
  await learner.getByLabel("What should we improve? (optional)").fill("More examples please");
  await learner.getByRole("button", { name: "Send feedback" }).click();
  await expect(learner.getByRole("status")).toHaveText("Thank you for your feedback");
  await learner.getByLabel("Your question").fill("Is there a lab for this?");
  await learner.getByRole("button", { name: "Post question" }).click();
  await expect(learner.getByText("Test Employee: Is there a lab for this?")).toBeVisible();

  // The admin answers, sees the feedback, and hides the question from learners.
  await admin.goto(`/learn/courses/${courseId}#qa`);
  await admin.getByLabel("Answer", { exact: true }).fill("Yes, next month.");
  await admin.getByRole("button", { name: "Reply" }).click();
  await expect(admin.getByText("Test Admin (L&D): Yes, next month.")).toBeVisible();
  await admin.goto(`/admin/courses/${courseId}`);
  await expect(admin.getByText("1 response, average usefulness 4 of 5.")).toBeVisible();
  await admin.goto(`/learn/courses/${courseId}#qa`);
  await admin.getByRole("button", { name: "Hide" }).first().click();
  await expect(admin.getByText("[hidden from learners]").first()).toBeVisible();
  await learner.reload();
  await expect(learner.getByText("Is there a lab for this?")).toHaveCount(0);

  // Search finds the course for the learner.
  await learner.goto(`/learn/search?q=${encodeURIComponent(title)}`);
  await expect(learner.getByRole("link", { name: title })).toBeVisible();
});
