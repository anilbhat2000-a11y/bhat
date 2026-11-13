import { test, expect, type Browser, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

// Admin builds a course and a quiz for everyone; the employee completes both; the manager
// sees the result; the admin dashboard shows the certificate.
test("the full loop: admin publishes, employee learns and passes, manager and admin see it", async ({ page, browser }: { page: Page; browser: Browser }) => {
  const stamp = Date.now();
  const courseTitle = `Flow course ${stamp}`;
  const quizTitle = `Flow quiz ${stamp}`;

  await signIn(page, "admin@example.test");
  await page.goto("/admin/courses");
  await page.fill("form[data-test=create-course] input[name=title]", courseTitle);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await page.fill("form[data-test=add-lesson] input[name=title]", "Read first");
  await page.fill("form[data-test=add-lesson] textarea[name=body]", "Start here.");
  await page.click("form[data-test=add-lesson] button[type=submit]");
  await page.click("form[data-test=publish] button[type=submit]");
  await expect(page.getByText("Status: Published")).toBeVisible();

  await page.goto("/admin/assessments");
  await page.fill("form[data-test=create-assessment] input[name=title]", quizTitle);
  await page.selectOption("form[data-test=create-assessment] select[name=subjectId]", { label: "E2E Subject" });
  await page.selectOption("form[data-test=create-assessment] select[name=cadence]", "MONTHLY");
  await page.click("form[data-test=create-assessment] button[type=submit]");
  await page.fill("form[data-test=add-question] input[name=text]", "Pick the second");
  await page.fill("form[data-test=add-question] input[name=options]", "One|Two|Three");
  await page.fill("form[data-test=add-question] input[name=correct]", "2");
  await page.click("form[data-test=add-question] button[type=submit]");
  await page.click("form[data-test=publish-assessment] button[type=submit]");
  await page.selectOption("select[name=targetType]", "USER");
  await page.fill("input[name=targetValue]", "placeholder");
  await page.selectOption("select[name=targetType]", "ALL");
  await page.click("button:has-text('Save assignment')");
  await expect(page.getByText("Assignment saved")).toBeVisible();

  const employeeContext = await browser.newContext();
  const employee = await employeeContext.newPage();
  await signIn(employee, "employee@example.test");
  await employee.goto("/learn/catalogue");
  await employee.getByRole("link", { name: courseTitle }).click();
  await employee.click("button:has-text('Mark complete')");
  await expect(employee.getByText("Progress: 100%")).toBeVisible();
  await employee.goto("/learn/assessments");
  await employee.locator("li", { hasText: quizTitle }).getByRole("button", { name: "Start" }).click();
  await employee.getByLabel("Two").check();
  await employee.click("button:has-text('Submit answers')");
  await expect(employee.getByText("Score: 100%")).toBeVisible();
  await expect(employee.getByText("Passed", { exact: true })).toBeVisible();
  await employeeContext.close();

  const managerContext = await browser.newContext();
  const manager = await managerContext.newPage();
  await signIn(manager, "manager@example.test");
  await manager.goto("/manager/team");
  await manager.getByRole("link", { name: "Test Employee" }).click();
  const attemptRow = manager.locator("li", { hasText: `${quizTitle} (` });
  await expect(attemptRow).toContainText("100% passed");
  await managerContext.close();

  await page.goto("/admin/dashboard");
  await expect(page.getByRole("cell", { name: "E2E Subject" })).toBeVisible();
});
