import { test, expect } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

test("an employee asks for a password reset and an admin sees and handles the request", async ({ browser }) => {
  const learner = await (await browser.newContext()).newPage();
  await learner.goto("/login");
  await learner.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(learner.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await learner.fill("input[name=email]", "leaver@example.test");
  await learner.click("button[type=submit]");
  // No mail server in the test setup: the request goes to the administrators.
  await expect(learner.getByRole("status")).toContainText("sent to the LMS administrator");

  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/login");
  await admin.fill("input[name=email]", "admin@example.test");
  await admin.fill("input[name=password]", TEST_PASSWORD);
  await admin.click("button[type=submit]");
  await expect(admin).toHaveURL(/\/admin/);
  await admin.goto("/admin/users");
  const row = admin.locator("[data-test=reset-requests] tr", { hasText: "leaver@example.test" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Dismiss" }).click();
  await expect(admin.getByRole("status")).toHaveText("Request closed");
  await expect(admin.locator("[data-test=reset-requests] tr", { hasText: "leaver@example.test" })).toHaveCount(0);
});

test("a broken reset link explains itself", async ({ page }) => {
  await page.goto("/reset-password?token=not-a-real-token");
  await expect(page.locator("p[role=alert]")).toHaveText("This link is not valid.");
  await expect(page.getByRole("link", { name: "Ask for a new link" })).toBeVisible();
});
