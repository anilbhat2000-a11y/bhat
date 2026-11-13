import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("an admin adds an instructor, and a manager opens the team sessions page", async ({ page, browser }) => {
  await signIn(page, "admin@example.test");
  await page.goto("/admin/instructors");
  const name = `Instructor ${Date.now()}`;
  await page.fill("form[data-test=create-instructor] input[name=name]", name);
  await page.fill("form[data-test=create-instructor] input[name=location]", "Pune, India");
  await page.fill("form[data-test=create-instructor] input[name=expertise]", "Networking, Cloud");
  await page.click("form[data-test=create-instructor] button[type=submit]");
  await expect(page.getByText("Instructor added")).toBeVisible();
  await expect(page.getByText(name)).toBeVisible();

  const managerContext = await browser.newContext();
  const manager = await managerContext.newPage();
  await signIn(manager, "manager@example.test");
  await manager.goto("/manager/sessions");
  await expect(manager.getByRole("heading", { name: "Team sessions" })).toBeVisible();
  await managerContext.close();
});
