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
async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
const pdf = (text: string) => ({ name: `${text}.pdf`, mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n% ${text}\n%%EOF\n`) });

test("an admin uploads a department-specific course, builds a learning path and assigns it", async ({ page, browser }) => {
  const stamp = Date.now();
  const title = `Accounts close ${stamp}`;
  const pathTitle = `Accounts onboarding ${stamp}`;
  await signIn(page, "admin@example.test");

  // Upload a course for one department, from two PDFs.
  await page.goto("/admin/courses/upload");
  await page.fill("form[data-test=upload-course] input[name=title]", title);
  await page.selectOption("form[data-test=upload-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.fill("form[data-test=upload-course] input[name=otherDepartments]", `Accounts ${stamp}`);
  await page.check("form[data-test=upload-course] input[name=publish]");
  await page.setInputFiles("form[data-test=upload-course] input[type=file]", [pdf("01 Month-end checklist"), pdf("02 Bank reconciliation")]);
  await page.click("form[data-test=upload-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Course published with 2 lessons.")).toBeVisible();
  await expect(page.getByText(`For: Accounts ${stamp}.`)).toBeVisible();
  await expect(page.getByText("01 Month-end checklist")).toBeVisible();

  // The employee is not in that department, so the course is hidden from them.
  const ctx = await browser.newContext();
  const learner = await ctx.newPage();
  await signIn(learner, "employee@example.test");
  await learner.goto("/learn/catalogue");
  await expect(learner.getByRole("link", { name: title })).toHaveCount(0);

  // Build a custom learning path through the training-type picker, then assign it.
  await page.goto("/admin/paths/new");
  await expect(page.getByRole("heading", { name: "What type of training do you want to create?" })).toBeVisible();
  await page.getByLabel(/Process and workflow/).check();
  await page.getByLabel(/Build a custom path/).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.fill("form[data-test=create-path] input[name=title]", pathTitle);
  await page.getByLabel(title).check();
  await page.click("form[data-test=create-path] button[type=submit]");
  await expect(page.getByRole("heading", { name: pathTitle })).toBeVisible();
  const employeeId = await page.locator("#path-targets option", { hasText: "Test Employee" }).getAttribute("value");
  await page.selectOption("form[data-test=assign-path] select[name=targetType]", "USER");
  await page.fill("form[data-test=assign-path] input[name=targetValue]", employeeId ?? "");
  await page.click("form[data-test=assign-path] button[type=submit]");
  await expect(page.getByText("Learning path assigned")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Test Employee" })).toBeVisible();

  // The learner now sees the path, and the course it contains.
  await learner.goto("/learn");
  await expect(learner.getByRole("heading", { name: "My learning paths" })).toBeVisible();
  await expect(learner.getByRole("heading", { name: pathTitle })).toBeVisible();
  await learner.goto("/learn/catalogue");
  await expect(learner.getByRole("link", { name: title })).toBeVisible();
  await ctx.close();
});

test("the admin and manager dashboards and certificate pages load and are accessible", async ({ page, browser }) => {
  await signIn(page, "admin@example.test");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Your LMS dashboard" })).toBeVisible();
  for (const card of ["Team members", "Learning paths", "Course completions", "Certificates"]) {
    await expect(page.getByRole("region", { name: card })).toBeVisible();
  }
  await page.getByRole("link", { name: /^Overdue \(/ }).click();
  await expect(page).toHaveURL(/tab=overdue/);
  await expectNoSeriousViolations(page);
  await page.goto("/admin/paths/new?mode=ready");
  await expectNoSeriousViolations(page);
  await page.goto("/admin/certificates");
  await expect(page.getByRole("heading", { name: "Issued certificates" })).toBeVisible();

  const ctx = await browser.newContext();
  const manager = await ctx.newPage();
  await signIn(manager, "manager@example.test");
  await manager.goto("/manager");
  await expect(manager.getByRole("heading", { name: "Your team's learning" })).toBeVisible();
  await expectNoSeriousViolations(manager);
  await manager.goto("/manager/paths");
  await expect(manager.getByRole("heading", { name: "Learning paths", level: 1 })).toBeVisible();
  await manager.goto("/manager/certificates");
  await expect(manager.getByRole("heading", { name: "Certificates", level: 1 })).toBeVisible();
  await ctx.close();
});
