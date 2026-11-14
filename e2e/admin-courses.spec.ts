import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

test("an admin builds a course, adds a lesson, and publishes it", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/courses");
  const title = `E2E course ${Date.now()}`;
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.fill("form[data-test=add-lesson] input[name=title]", "Welcome");
  await page.fill("form[data-test=add-lesson] textarea[name=body]", "Read this first.");
  await page.click("form[data-test=add-lesson] button[type=submit]");
  await expect(page.locator(`li[data-lesson-title="Welcome"]`)).toBeVisible();

  await page.click("form[data-test=publish] button[type=submit]");
  await expect(page.getByText("Status: Published")).toBeVisible();
});

test("a non-PDF file uploaded as a PDF lesson is refused with a clear reason", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/courses");
  const title = `E2E upload ${Date.now()}`;
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.fill("form[data-test=upload-lesson] input[name=title]", "Bad file");
  await page.setInputFiles("form[data-test=upload-lesson] input[type=file]", {
    name: "page.html",
    mimeType: "text/html",
    buffer: Buffer.from("<html></html>"),
  });
  await page.click("form[data-test=upload-lesson] button[type=submit]");
  await expect(page.locator("p[role=alert]")).toContainText("not allowed");
});
