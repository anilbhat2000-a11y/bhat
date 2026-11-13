import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("the admin dashboard shows every section of the brief, filters, and exports a filtered table", async ({ page }) => {
  await signIn(page, "admin@example.test");
  await page.goto("/admin/dashboard");
  for (const heading of [
    "Certifications by subject", "Course completion by subject", "Course completion by course", "Course completions per month",
    "Assessment results by subject and type", "Overdue and not-started assessments by department", "Top performers",
    "Learners who need support", "Certificates expiring soon", "Company health",
  ]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await page.getByLabel("Level").selectOption("BASIC");
  await page.getByLabel("Period").selectOption("month");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/level=BASIC/);
  await expect(page.getByText("Showing: level basic, last 30 days.")).toBeVisible();

  const csv = await page.request.get("/api/export/dashboard/assessments?level=BASIC&period=month");
  expect(csv.status()).toBe(200);
  expect((await csv.text()).replace(/^﻿/, "").split("\r\n")[0]).toBe(
    "subject,cadence,attempts,pass_rate_percent,average_score,periods_1_attempt,periods_2_attempts,periods_3_plus_attempts",
  );
  expect((await page.request.get("/api/export/dashboard/not-a-section")).status()).toBe(404);
});

test("dashboard exports are for admins only", async ({ page }) => {
  await signIn(page, "manager@example.test");
  expect((await page.request.get("/api/export/dashboard/certifications")).status()).toBe(403);
});

test("a manager sees the team heat map, and an employee sees progress and certificates", async ({ browser }) => {
  const manager = await browser.newPage();
  await signIn(manager, "manager@example.test");
  await manager.goto("/manager/team/summary");
  await expect(manager.getByRole("heading", { name: "Subject heat map" })).toBeVisible();

  const employee = await browser.newPage();
  await signIn(employee, "employee@example.test");
  await expect(employee.getByRole("heading", { name: "My progress by subject" })).toBeVisible();
  await expect(employee.getByRole("heading", { name: "My certificates" })).toBeVisible();
});
