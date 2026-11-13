import { test, expect, type Page } from "@playwright/test";
import { runDb } from "./db";

const PASSWORD = "Test-pass-1";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
}

test("an employee who opens the admin portal is sent to their own home page", async ({ page }) => {
  await signIn(page, "employee@example.test");
  await expect(page).toHaveURL(/\/learn/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/learn/);
});

test("an admin can open the admin portal", async ({ page }) => {
  await signIn(page, "admin@example.test");
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
});

test("a wrong password shows one generic error and stays on the login page", async ({ page }) => {
  await page.goto("/login");
  await page.fill("input[name=email]", "employee@example.test");
  await page.fill("input[name=password]", "wrong-password");
  await page.click("button[type=submit]");
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a deactivated user is signed out on the next request (Review Focus 2)", async ({ page }) => {
  await signIn(page, "leaver@example.test");
  await expect(page).toHaveURL(/\/learn/);
  runDb(["set-active", "leaver@example.test", "false"]);
  await page.goto("/learn");
  await expect(page).toHaveURL(/\/login/);
  runDb(["set-active", "leaver@example.test", "true"]);
});
