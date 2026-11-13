import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

test("a 20 MB PDF uploads as a lesson (review Critical 3: uploads above 10 MB)", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/courses");
  const title = `Large upload ${Date.now()}`;
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(20 * 1024 * 1024, 0x20)]);
  await page.fill("form[data-test=upload-lesson] input[name=title]", "Big guide");
  await page.setInputFiles("form[data-test=upload-lesson] input[type=file]", { name: "guide.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.click("form[data-test=upload-lesson] button[type=submit]");
  await expect(page.getByText("File uploaded")).toBeVisible();
});
