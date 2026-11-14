import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD, runDb } from "./db";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

async function courseWithTextLesson(page: Page, title: string): Promise<string> {
  await page.goto("/admin/courses");
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.fill("form[data-test=add-lesson] input[name=title]", "Welcome");
  await page.fill("form[data-test=add-lesson] textarea[name=body]", "Old text.");
  await page.click("form[data-test=add-lesson] button[type=submit]");
  return runDb(["lesson-id", "Welcome", title]);
}

test("without an API key the AI assistant explains how to switch it on", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/ai");
  await expect(page.getByRole("heading", { name: "AI assistant", level: 1 })).toBeVisible();
  await expect(page.locator("[data-test=ai-off]")).toContainText("ANTHROPIC_API_KEY");
  await expect(page.locator("form[data-test=ai-course-form] button[type=submit]")).toBeDisabled();
});

test("an admin edits a text lesson by hand", async ({ page }) => {
  await signInAsAdmin(page);
  const title = `E2E edit ${Date.now()}`;
  await courseWithTextLesson(page, title);
  await page.locator("[data-test=text-lesson-tools]").getByRole("link", { name: "Edit text" }).click();
  await page.fill("form[data-test=edit-lesson] textarea[name=body]", "New text.\n\n## Steps\n\n- one");
  await page.click("form[data-test=edit-lesson] button[type=submit]");
  await expect(page.getByRole("status")).toHaveText("Lesson saved");
  await expect(page.locator(".ai-preview")).toContainText("Steps");
});

test("an admin reviews an AI lesson rewrite, edits it and saves it over the lesson", async ({ page }) => {
  await signInAsAdmin(page);
  const title = `E2E ai ${Date.now()}`;
  const lessonId = await courseWithTextLesson(page, title);
  const draftId = runDb(["ai-lesson-draft", lessonId]);
  await page.goto(`/admin/ai/${draftId}`);
  await expect(page.locator("[data-test=ai-draft-status]")).toHaveText("Ready to review");
  await expect(page.locator("[data-test=ai-review-notes]")).toContainText("SLA hours");
  await page.fill("form[data-test=ai-review] textarea[name=body]", "Better intro, checked by the admin.\n\n## Key terms\n\n- **SLA**: 4 hours");
  await page.click("[data-test=ai-apply]");
  await expect(page.getByRole("status")).toContainText("updated with the reviewed AI text");
  await expect(page.getByText("Rewritten by AI").first()).toBeVisible();
  await page.goto(`/admin/ai/${draftId}`);
  await expect(page.locator("[data-test=ai-draft-status]")).toHaveText("Applied");
});
