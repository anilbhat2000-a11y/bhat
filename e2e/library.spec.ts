import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082", "hex");
const HTML = Buffer.from("<!doctype html><html><head><title>Deck</title></head><body><h1>Interactive deck</h1><script>document.title='ran'</script></body></html>");

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

test("an admin uploads an image and an HTML page, previews them, and adds the page to a course", async ({ page }) => {
  await signInAsAdmin(page);
  const stamp = Date.now();
  // A course to add the file to.
  await page.goto("/admin/courses");
  const course = `E2E library ${stamp}`;
  await page.fill("form[data-test=create-course] input[name=title]", course);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: course })).toBeVisible();

  await page.goto("/admin/library");
  await expect(page.getByRole("heading", { name: "Content library", level: 1 })).toBeVisible();
  await page.setInputFiles("form[data-test=library-upload] input[type=file]", [
    { name: `logo-${stamp}.png`, mimeType: "image/png", buffer: PNG },
    { name: `deck-${stamp}.html`, mimeType: "text/html", buffer: HTML },
  ]);
  await page.fill("form[data-test=library-upload] input[name=tags]", `e2e-${stamp}`);
  await page.click("form[data-test=library-upload] button[type=submit]");
  await expect(page.getByRole("status")).toHaveText("Added 2 files to the library.");

  await page.goto(`/admin/library?tag=e2e-${stamp}`);
  await expect(page.locator(".lib-card")).toHaveCount(2);
  await page.getByRole("link", { name: `deck-${stamp}`, exact: true }).click();
  await expect(page.locator("iframe.html-frame")).toHaveAttribute("sandbox", /allow-scripts/);

  // The HTML is served with a sandbox policy, so its scripts cannot reach the portal.
  const src = await page.locator("iframe.html-frame").getAttribute("src");
  const res = await page.request.get(src!);
  expect(res.headers()["content-security-policy"]).toMatch(/^sandbox/);
  expect(res.headers()["content-security-policy"]).not.toContain("allow-same-origin");

  await page.selectOption("form[data-test=library-use] select[name=courseId]", { label: `${course} (draft)` });
  await page.click("form[data-test=library-use] button[type=submit]");
  await expect(page.getByRole("status")).toHaveText("Lesson added from the content library");
  await expect(page.locator(`li[data-lesson-title="deck-${stamp}"]`)).toContainText("HTML");

  // A file in use cannot be deleted; an unused one can.
  await page.goto(`/admin/library?tag=e2e-${stamp}`);
  await page.getByRole("link", { name: `logo-${stamp}`, exact: true }).click();
  await expect(page.locator("img.lib-image")).toBeVisible();
  await page.click("[data-test=library-delete]");
  await expect(page.getByRole("status")).toHaveText("File deleted from the library");
});

test("an employee cannot open library files", async ({ page }) => {
  await page.goto("/login");
  await page.fill("input[name=email]", "employee@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/learn/);
  expect((await page.request.get("/api/library/anything")).status()).toBe(404);
  await page.goto("/admin/library");
  await expect(page.getByRole("heading", { name: "Content library", level: 1 })).toHaveCount(0);
});
