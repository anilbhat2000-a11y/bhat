import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

test("an admin drags a lesson above another, and the new order is kept", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/courses");
  const title = `Reorder ${Date.now()}`;
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  for (const t of ["First lesson", "Second lesson"]) {
    await page.fill("form[data-test=add-lesson] input[name=title]", t);
    await page.fill("form[data-test=add-lesson] textarea[name=body]", "Text");
    await page.click("form[data-test=add-lesson] button[type=submit]");
    await expect(page.getByText("Lesson added")).toBeVisible();
  }
  const second = page.locator("li[data-lesson-title='Second lesson']");
  const first = page.locator("li[data-lesson-title='First lesson']");
  // Wait for the server to save the order before reloading, so the reload sees it.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/admin/courses/"));
  await second.dragTo(first);
  await saved;
  await expect(page.locator("ol[data-test=lesson-list] li").first()).toHaveAttribute("data-lesson-title", "Second lesson");
  await page.reload();
  await expect(page.locator("ol[data-test=lesson-list] li").first()).toHaveAttribute("data-lesson-title", "Second lesson");
});
