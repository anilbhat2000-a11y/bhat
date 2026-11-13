import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD, runDb } from "./db";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

async function newCourse(page: Page, title: string) {
  await page.goto("/admin/courses");
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  return runDb(["course-id", title]);
}

test("a PDF posted to the streaming upload route becomes a lesson", async ({ page }) => {
  await signInAsAdmin(page);
  const title = `Stream ${Date.now()}`;
  const courseId = await newCourse(page, title);
  const res = await page.request.post("/api/upload/lesson", {
    multipart: {
      courseId,
      title: "Streamed guide",
      type: "PDF",
      file: { name: "guide.pdf", mimeType: "application/pdf", buffer: Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(3 * 1024 * 1024, 0x20)]) },
    },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(303);
  expect(res.headers()["location"]).toContain("notice=");
  await page.goto(`/admin/courses/${courseId}`);
  await expect(page.getByText("Streamed guide")).toBeVisible();
});

test("an oversize upload is refused while streaming, and no lesson is created", async ({ page }) => {
  await signInAsAdmin(page);
  const title = `Too big ${Date.now()}`;
  const courseId = await newCourse(page, title);
  const res = await page.request.post("/api/upload/lesson", {
    multipart: {
      courseId,
      title: "Too big guide",
      type: "PDF",
      file: { name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(51 * 1024 * 1024, 0x20)]) },
    },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(303);
  expect(decodeURIComponent(res.headers()["location"])).toContain("too large");
  await page.goto(`/admin/courses/${courseId}`);
  await expect(page.getByText("Too big guide")).toHaveCount(0);
});
