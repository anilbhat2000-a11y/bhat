import { test, expect } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

test("an admin opens Email settings, sees email is off, and a bad server name is refused", async ({ page }) => {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
  await page.getByRole("link", { name: "Email settings" }).click();
  await expect(page.getByRole("heading", { name: "Email settings", level: 1 })).toBeVisible();
  await expect(page.locator("[data-test=mail-status]")).toContainText(/Email is (off|on)/);
  const form = page.locator("form[data-test=mail-settings]");
  await form.locator("input[name=host]").fill("smtp office365 com");
  await form.locator("input[name=fromAddress]").fill("lms@example.test");
  await form.locator("button[type=submit]").click();
  await expect(page.locator("p[role=alert]")).toContainText("mail server name");
});
