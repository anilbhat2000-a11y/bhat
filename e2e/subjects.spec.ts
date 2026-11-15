import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[name=email]", "admin@example.test");
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin/);
}

test("an admin adds, renames and deletes a subject area", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/subjects");
  await expect(page.getByRole("heading", { name: "Subject areas", level: 1 })).toBeVisible();
  const name = `E2E area ${Date.now()}`;
  await page.fill("form[data-test=create-subject] input[name=name]", name);
  await page.selectOption("form[data-test=create-subject] select[name=category]", "BUSINESS");
  await page.click("form[data-test=create-subject] button[type=submit]");
  await expect(page.getByRole("status")).toHaveText(`Subject "${name}" added`);

  // A duplicate name is refused with a clear message.
  await page.fill("form[data-test=create-subject] input[name=name]", name.toUpperCase());
  await page.click("form[data-test=create-subject] button[type=submit]");
  await expect(page.locator("p[role=alert]")).toContainText("already exists");

  const row = page.locator("tr", { hasText: name });
  await row.getByRole("link", { name: "Edit" }).click();
  await page.fill("form[data-test=edit-subject] input[name=name]", `${name} renamed`);
  await page.fill("form[data-test=edit-subject] input[name=certificationValidityMonths]", "24");
  await page.click("form[data-test=edit-subject] button[type=submit]");
  await expect(page.getByRole("status")).toHaveText(`Subject "${name} renamed" saved`);
  const renamed = page.locator("tr", { hasText: `${name} renamed` });
  await expect(renamed).toContainText("2 years");

  await renamed.getByRole("button", { name: `Delete ${name} renamed` }).click();
  await expect(page.getByRole("status")).toHaveText("Subject deleted");
  await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
});
