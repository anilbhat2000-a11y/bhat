import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/(admin|manager|learn)/);
}

test("an admin sees each employee's trainings and downloads the Excel report", async ({ page }) => {
  await signIn(page, "admin@example.test");
  await page.goto("/admin/reports/training");
  await expect(page.getByRole("heading", { name: "Employee training report" })).toBeVisible();
  await page.fill("input[name=q]", "employee@example.test");
  await page.click("form[aria-label='Filter the report'] button[type=submit]");
  await expect(page.locator("details.tr-emp")).toHaveCount(1);
  const employee = page.locator("details[data-employee='employee@example.test']");
  await employee.locator("summary").click();
  await expect(employee).toHaveAttribute("open", "");
  const download = page.waitForEvent("download");
  await page.click("[data-test=training-export]");
  expect((await download).suggestedFilename()).toMatch(/^training-report-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test("a manager sees the training report for their team only", async ({ page }) => {
  await signIn(page, "manager@example.test");
  await page.goto("/manager/training");
  await expect(page.getByRole("heading", { name: "Team training report" })).toBeVisible();
  await expect(page.locator("details[data-employee='employee@example.test']")).toBeVisible();
  await expect(page.locator("details[data-employee='admin@example.test']")).toHaveCount(0);
});

test("employees cannot open the training report or its export", async ({ page }) => {
  await signIn(page, "employee@example.test");
  const res = await page.request.get("/api/export/training");
  expect(res.status()).toBe(403);
});
