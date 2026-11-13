import { test, expect, type Browser, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
}

test("an employee finds a published course, completes its lesson, and sees progress", async ({ page, browser }: { page: Page; browser: Browser }) => {
  // Admin builds and publishes the course.
  await signIn(page, "admin@example.test");
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/admin/courses");
  const title = `E2E learner ${Date.now()}`;
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.fill("form[data-test=add-lesson] input[name=title]", "Lesson one");
  await page.fill("form[data-test=add-lesson] textarea[name=body]", "Read this.");
  await page.click("form[data-test=add-lesson] button[type=submit]");
  await page.click("form[data-test=publish] button[type=submit]");
  await expect(page.getByText("Status: Published")).toBeVisible();

  // Employee signs in, in a separate browser session.
  const employeeContext = await browser.newContext();
  const employee = await employeeContext.newPage();
  await signIn(employee, "employee@example.test");
  await expect(employee).toHaveURL(/\/learn/);
  await employee.goto("/learn/catalogue");
  await employee.getByRole("link", { name: title }).click();
  await expect(employee.getByText("Progress: 0%")).toBeVisible();
  await employee.click("button:has-text('Mark complete')");
  await expect(employee.getByText("Progress: 100%")).toBeVisible();
  await employeeContext.close();
});
