import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD, runDb } from "./db";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

test("a video streams in ranges, and its captions are served", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/courses");
  const title = `Video ${Date.now()}`;
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // A minimal MP4 header ("ftyp" box) so the upload passes the file signature check.
  const video = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(1988, 0x41)]);
  await page.fill("form[data-test=upload-lesson] input[name=title]", title);
  await page.setInputFiles("form[data-test=upload-lesson] input[type=file]", { name: "clip.mp4", mimeType: "video/mp4", buffer: video });
  await page.click("form[data-test=upload-lesson] button[type=submit]");
  await expect(page.getByText("File uploaded")).toBeVisible();

  const id = runDb(["lesson-id", title]);
  expect(id).not.toBe("");
  const part = await page.request.get(`/api/files/${id}`, { headers: { range: "bytes=0-99" } });
  expect(part.status()).toBe(206);
  expect(part.headers()["content-range"]).toBe("bytes 0-99/2000");
  expect((await part.body()).length).toBe(100);

  const tail = await page.request.get(`/api/files/${id}`, { headers: { range: "bytes=1990-" } });
  expect(tail.status()).toBe(206);
  expect((await tail.body()).length).toBe(10);

  const bad = await page.request.get(`/api/files/${id}`, { headers: { range: "bytes=5000-6000" } });
  expect(bad.status()).toBe(416);

  const whole = await page.request.get(`/api/files/${id}`);
  expect(whole.status()).toBe(200);
  expect((await whole.body()).length).toBe(2000);
  expect(whole.headers()["accept-ranges"]).toBe("bytes");

  // Captions: upload a WebVTT file for the video, then fetch it.
  await page.goto(`/admin/courses/${runDb(["lesson-course-id", title])}`);
  await page.setInputFiles(`form:has-text("Upload captions") input[type=file]`, {
    name: "captions.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from("WEBVTT\n\n00:00.000 --> 00:01.000\nHello\n"),
  });
  await page.click("form:has-text('Upload captions') button[type=submit]");
  await expect(page.getByText("Captions saved")).toBeVisible();
  const vtt = await page.request.get(`/api/captions/${id}`);
  expect(vtt.status()).toBe(200);
  expect(vtt.headers()["content-type"]).toContain("text/vtt");
  expect((await vtt.text())).toContain("Hello");
});
