import { test, expect } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

test("the learner home shows what is due, and the certifications page opens", async ({ page }) => {
  await page.goto("/login");
  await page.fill("input[name=email]", "employee@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/learn/);

  await expect(page.getByRole("heading", { name: "Your learning" })).toBeVisible();
  await expect(page.getByText("Due this week")).toBeVisible();
  await expect(page.getByText("Due this month")).toBeVisible();
  await expect(page.getByText("Due this year")).toBeVisible();
  await expect(page.getByText("Overdue")).toBeVisible();
  await page.getByRole("link", { name: "My certifications" }).click();
  await expect(page.getByRole("heading", { name: "My certifications" })).toBeVisible();
});
