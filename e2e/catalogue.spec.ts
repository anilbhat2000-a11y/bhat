import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("the admin catalogue lists courses in a table with edit, modify and delete", async ({ page }) => {
  await signIn(page, "admin@example.test");
  const title = `Catalogue course ${Date.now()}`;
  await page.goto("/admin/courses");
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // Search finds it; the row has the three actions.
  await page.goto(`/admin/courses?q=${encodeURIComponent(title)}`);
  await expect(page.getByRole("heading", { name: "Course catalogue" })).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row.getByRole("cell", { name: "Draft" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

  // Modify: rename and change level.
  await row.getByRole("link", { name: "Modify" }).click();
  await expect(page.getByRole("heading", { name: "Modify course" })).toBeVisible();
  await page.fill("form[data-test=modify-course] input[name=title]", `${title} v2`);
  await page.selectOption("form[data-test=modify-course] select[name=level]", "ADVANCED");
  await page.click("form[data-test=modify-course] button[type=submit]");
  await expect(page.getByText("Course updated")).toBeVisible();
  await page.goto(`/admin/courses?q=${encodeURIComponent(`${title} v2`)}`);
  const changed = page.getByRole("row", { name: new RegExp(`${title} v2`) });
  await expect(changed.getByRole("cell", { name: "Advanced" })).toBeVisible();

  // Edit opens the course editor.
  await changed.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: `${title} v2` })).toBeVisible();

  // Delete asks for confirmation, then removes it.
  await page.goto(`/admin/courses?q=${encodeURIComponent(`${title} v2`)}`);
  await page.getByRole("row", { name: new RegExp(`${title} v2`) }).getByRole("link", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "Confirm deletion" })).toBeVisible();
  await page.check("form[data-test=delete-course] input[name=confirm]");
  await page.click("form[data-test=delete-course] button[type=submit]");
  await expect(page.getByText("Course deleted")).toBeVisible();
  await page.goto(`/admin/courses?q=${encodeURIComponent(`${title} v2`)}`);
  await expect(page.getByText("No courses match.")).toBeVisible();
});

test("the learner catalogue is a searchable table", async ({ page }) => {
  await signIn(page, "employee@example.test");
  await page.goto("/learn/catalogue?q=zzzz-no-match");
  await expect(page.getByText("0 courses")).toBeVisible();
  await page.goto("/learn/catalogue");
  await expect(page.getByRole("columnheader", { name: "Your progress" }).first()).toBeVisible();
});
