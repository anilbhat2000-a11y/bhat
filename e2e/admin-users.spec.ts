import { test, expect } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

test("an admin creates a user and sees them in the list", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/users");
  const email = `new${Date.now()}@example.test`;
  await page.fill("form[data-test=create-user] input[name=name]", "Created Person");
  await page.fill("form[data-test=create-user] input[name=email]", email);
  await page.selectOption("form[data-test=create-user] select[name=role]", "EMPLOYEE");
  await page.fill("form[data-test=create-user] input[name=password]", "Start-pass-1");
  await page.click("form[data-test=create-user] button[type=submit]");
  await expect(page.getByText(email)).toBeVisible();
});

test("a CSV import with one bad row names the row and creates nobody", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/users");
  const good = `csvgood${Date.now()}@example.test`;
  const csv = [
    "name,email,role,department,managerEmail,password",
    `Good Person,${good},EMPLOYEE,Sales,,Start-pass-1`,
    "Bad Person,not-an-email,EMPLOYEE,Sales,,Start-pass-1",
  ].join("\n");
  await page.fill("form[data-test=import-users] textarea[name=csv]", csv);
  await page.click("form[data-test=import-users] button[type=submit]");
  await expect(page.getByText(/Row 2/)).toBeVisible();
  await expect(page.getByText(good)).toHaveCount(0);
});
