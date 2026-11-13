import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("a visitor who is not signed in is sent to the login page", async ({ page }) => {
  await page.goto("/learn");
  await expect(page).toHaveURL(/\/login/);
});

test("an employee cannot reach the admin or manager portals", async ({ page }) => {
  await signIn(page, "employee@example.test");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/learn/);
  await page.goto("/manager/team");
  await expect(page).toHaveURL(/\/learn/);
});

test("an employee cannot read a colleague's learning record", async ({ page }) => {
  await signIn(page, "employee@example.test");
  await page.goto("/manager/team/anyone");
  await expect(page).toHaveURL(/\/learn/);
});

test("a manager cannot reach the admin portal", async ({ page }) => {
  await signIn(page, "manager@example.test");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/manager/);
});

test("the export endpoints refuse anonymous and out-of-role requests", async ({ page }) => {
  expect((await page.request.get("/api/export/certifications")).status()).toBe(401);
  await signIn(page, "employee@example.test");
  expect((await page.request.get("/api/export/certifications")).status()).toBe(403);
});
