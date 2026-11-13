import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
}

test("the front page introduces the portal to a visitor who is not signed in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /3C IT Solutions/ })).toBeVisible();
  await expect(page.getByText(/employees only/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
});

test("a signed-in admin opening the front page is taken to the admin portal", async ({ page }) => {
  await signIn(page, "admin@example.test");
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/admin/);
});

test("a signed-in employee opening the front page is taken to the learning portal", async ({ page }) => {
  await signIn(page, "employee@example.test");
  await expect(page).toHaveURL(/\/learn/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/learn/);
});

test("the sign-in page sends a signed-in person to their own portal", async ({ page }) => {
  await signIn(page, "employee@example.test");
  await expect(page).toHaveURL(/\/learn/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/learn/);
});
