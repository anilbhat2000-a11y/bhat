import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("admin sees the certification dashboard and can export it as CSV", async ({ page }) => {
  await signIn(page, "admin@example.test");
  await page.goto("/admin/dashboard");
  await expect(page.getByRole("heading", { name: "Certifications by subject" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Company health" })).toBeVisible();

  const csv = await page.request.get("/api/export/certifications");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect((await csv.text()).split("\r\n")[0]).toBe("name,email,department,subject,level,issued,expires,status");
});

test("a manager can export their team, but not company-wide reports", async ({ page }) => {
  await signIn(page, "manager@example.test");
  const team = await page.request.get("/api/export/team");
  expect(team.status()).toBe(200);
  const company = await page.request.get("/api/export/company-health");
  expect(company.status()).toBe(403);
});

test("an employee cannot export anything", async ({ page }) => {
  await signIn(page, "employee@example.test");
  expect((await page.request.get("/api/export/certifications")).status()).toBe(403);
});
