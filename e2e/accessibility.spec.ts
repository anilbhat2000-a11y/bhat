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

// WCAG 2.1 AA rules. Serious and critical violations fail the test.
async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("the login page has no serious or critical WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/login");
  await expectNoSeriousViolations(page);
});

test("the admin dashboard has no serious or critical WCAG 2.1 AA violations", async ({ page }) => {
  await signIn(page, "admin@example.test");
  await page.goto("/admin/dashboard");
  await expectNoSeriousViolations(page);
});

test("the learner catalogue has no serious or critical WCAG 2.1 AA violations", async ({ page }) => {
  await signIn(page, "employee@example.test");
  await page.goto("/learn/catalogue");
  await expectNoSeriousViolations(page);
});

for (const path of ["/admin/users", "/admin/subjects", "/admin/courses", "/admin/assessments", "/admin/instructors", "/admin/grading"]) {
  test(`${path} has no serious or critical WCAG 2.1 AA violations (labelled form fields)`, async ({ page }) => {
    await signIn(page, "admin@example.test");
    await page.goto(path);
    await expectNoSeriousViolations(page);
  });
}
