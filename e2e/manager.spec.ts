import { test, expect } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

test("a manager sees their team and opens a member's learning record", async ({ page }) => {
  await page.goto("/login");
  await page.fill("input[name=email]", "manager@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/manager/);

  await page.goto("/manager/team");
  await page.getByRole("link", { name: "Test Employee" }).click();
  await expect(page.getByRole("heading", { name: "Test Employee" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Course progress" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assessment attempts" })).toBeVisible();
});

test("a manager cannot open a user outside their team", async ({ page }) => {
  await page.goto("/login");
  await page.fill("input[name=email]", "manager@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/manager/);
  await page.goto("/manager/team/not-in-my-line");
  // The forbidden page is shown and no record data is rendered. The HTTP status is 200 here
  // because the portal shell has already streamed before the scope check runs.
  await expect(page.getByRole("heading", { name: "You do not have access to this record" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Course progress" })).toHaveCount(0);
});
