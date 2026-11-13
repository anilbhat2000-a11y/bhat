import { test, expect, type Browser, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
}

test("an employee takes a published monthly assessment and sees a pass", async ({ page, browser }: { page: Page; browser: Browser }) => {
  await signIn(page, "admin@example.test");
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/admin/assessments");
  const title = `E2E take ${Date.now()}`;
  await page.fill("form[data-test=create-assessment] input[name=title]", title);
  await page.selectOption("form[data-test=create-assessment] select[name=subjectId]", { label: "E2E Subject" });
  await page.selectOption("form[data-test=create-assessment] select[name=cadence]", "MONTHLY");
  await page.click("form[data-test=create-assessment] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.fill("form[data-test=add-question] input[name=text]", "Pick B now");
  await page.fill("form[data-test=add-question] input[name=options]", "A|B|C");
  await page.fill("form[data-test=add-question] input[name=correct]", "2");
  await page.click("form[data-test=add-question] button[type=submit]");
  await page.click("form[data-test=publish-assessment] button[type=submit]");
  await page.selectOption("select[name=targetType]", "ALL");
  await page.click("button:has-text('Save assignment')");
  await expect(page.getByText("Assignment saved")).toBeVisible();

  const employeeContext = await browser.newContext();
  const employee = await employeeContext.newPage();
  await signIn(employee, "employee@example.test");
  await expect(employee).toHaveURL(/\/learn/);
  await employee.goto("/learn/assessments");
  const row = employee.locator("li", { hasText: title });
  await row.getByRole("button", { name: "Start" }).click();
  await expect(employee.getByText("Pick B now")).toBeVisible();
  await employee.getByLabel("B").check();
  await employee.click("button:has-text('Submit answers')");
  await expect(employee.getByText("Score: 100%")).toBeVisible();
  await expect(employee.getByText("Passed", { exact: true })).toBeVisible();
  await employeeContext.close();
});
