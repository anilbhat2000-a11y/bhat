import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

test("an admin creates an assessment, adds a question, and publishes it", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/assessments");
  const title = `E2E quiz ${Date.now()}`;
  await page.fill("form[data-test=create-assessment] input[name=title]", title);
  await page.selectOption("form[data-test=create-assessment] select[name=subjectId]", { label: "E2E Subject" });
  await page.selectOption("form[data-test=create-assessment] select[name=cadence]", "WEEKLY");
  await page.click("form[data-test=create-assessment] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.fill("form[data-test=add-question] input[name=text]", "Which option is B?");
  await page.fill("form[data-test=add-question] input[name=options]", "A|B|C");
  await page.fill("form[data-test=add-question] input[name=correct]", "2");
  await page.click("form[data-test=add-question] button[type=submit]");
  await expect(page.getByText("Which option is B?")).toBeVisible();

  await page.click("form[data-test=publish-assessment] button[type=submit]");
  await expect(page.getByText("Status: Published")).toBeVisible();
});

test("a question import with one bad row names the row and adds nothing", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/assessments");
  const title = `E2E import ${Date.now()}`;
  await page.fill("form[data-test=create-assessment] input[name=title]", title);
  await page.selectOption("form[data-test=create-assessment] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-assessment] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  const csv = [
    "type,text,options,correct,points",
    "SINGLE,Good question,A|B,1,1",
    "SINGLE,Bad question,A|B,9,1",
  ].join("\n");
  await page.fill("form[data-test=import-questions] textarea[name=csv]", csv);
  await page.click("form[data-test=import-questions] button[type=submit]");
  await expect(page.locator("p[role=alert]")).toContainText("Row 2");
  await expect(page.getByText("Good question")).toHaveCount(0);
});
