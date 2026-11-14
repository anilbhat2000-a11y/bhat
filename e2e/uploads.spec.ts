import { test, expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { TEST_PASSWORD, runDb } from "./db";
import { questionsWordExample } from "../src/lib/import/templates";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("an admin bulk uploads courses from Excel with PDF and Word lessons and questions", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const title = `Bulk course ${stamp}`;
  await signIn(page, "admin@example.test");

  // The template downloads as an Excel file.
  await page.goto("/admin/courses/bulk");
  const template = await page.request.get("/api/templates/bulk-courses");
  expect(template.status()).toBe(200);
  expect(template.headers()["content-type"]).toContain("spreadsheetml");

  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Courses").addRows([["Course code", "Title", "Subject", "Level", "Publish"], ["C1", title, "E2E Subject", "Basic", "Yes"]]);
  wb.addWorksheet("Modules").addRows([["Course code", "Module number", "Module title", "Minutes"], ["C1", 1, "Getting started", 15]]);
  wb.addWorksheet("Lessons").addRows([
    ["Course code", "Module number", "Lesson title", "Type", "File name", "Text"],
    ["C1", 1, "Guide", "File", "guide.pdf", ""],
    ["C1", 1, "Handbook", "File", "Handbook.docx", ""],
    ["C1", "", "Summary", "Text", "", "Remember the key points."],
  ]);
  wb.addWorksheet("Questions").addRows([
    ["Course code", "Type", "Question", "Option 1", "Option 2", "Correct", "Explanation"],
    ["C1", "SINGLE", "Pick the first", "First", "Second", "A", "The first one."],
  ]);
  const workbook = Buffer.from(await wb.xlsx.writeBuffer());

  await page.setInputFiles("form[data-test=bulk-upload] input[name=workbook]", { name: "courses.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: workbook });
  await page.setInputFiles("form[data-test=bulk-upload] input[name=files]", [
    { name: "guide.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") },
    { name: "Handbook.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await questionsWordExample() },
  ]);
  await page.click("form[data-test=bulk-upload] button[type=submit]");
  await expect(page.getByRole("heading", { name: /Created 1 course with 3 lessons and 1 questions/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Published" })).toBeVisible();

  // The Word lesson is converted to PDF in the background, keeping the original.
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect.poll(async () => {
    await page.reload();
    return (await page.locator("main").innerText()).includes("PDF from Word");
  }, { timeout: 120_000, intervals: [2000] }).toBe(true);

  // A file with mistakes is rejected with a list of what to fix, and nothing is created.
  await page.goto("/admin/courses/bulk");
  const bad = new ExcelJS.Workbook();
  bad.addWorksheet("Courses").addRows([["Course code", "Title", "Subject"], ["C1", `Bad ${stamp}`, "No such subject"]]);
  await page.setInputFiles("form[data-test=bulk-upload] input[name=workbook]", { name: "courses.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(await bad.xlsx.writeBuffer()) });
  await page.click("form[data-test=bulk-upload] button[type=submit]");
  await expect(page.getByRole("heading", { name: /Nothing was created/ })).toBeVisible();
  await expect(page.getByText('Subject "No such subject" is not in the portal')).toBeVisible();

  // Questions can also be imported from a Word file on the assessment page.
  const checkId = runDb(["check-id", title]);
  await page.goto(`/admin/assessments/${checkId}`);
  await page.setInputFiles("form[data-test=import-question-file] input[type=file]", { name: "questions.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await questionsWordExample() });
  await page.click("form[data-test=import-question-file] button[type=submit]");
  await expect(page.getByText("Imported 5 questions from questions.docx")).toBeVisible();
});

test("the course editor accepts a PowerPoint-style Office file and refuses a disguised one", async ({ page }) => {
  await signIn(page, "admin@example.test");
  const title = `Office lesson ${Date.now()}`;
  await page.goto("/admin/courses");
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.setInputFiles("form[data-test=upload-lesson] input[type=file]", { name: "slides.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer: Buffer.from("not really a pptx") });
  await page.click("form[data-test=upload-lesson] button[type=submit]");
  await expect(page.locator("p[role=alert]")).toContainText("does not look like a real PowerPoint file");
});
