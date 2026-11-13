import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("a proctored attempt hides questions until full screen and submits itself at the violation limit", async ({ browser }) => {
  const admin = await browser.newPage();
  await signIn(admin, "admin@example.test");
  await admin.goto("/admin/assessments");
  const title = `E2E proctored ${Date.now()}`;
  await admin.fill("form[data-test=create-assessment] input[name=title]", title);
  await admin.selectOption("form[data-test=create-assessment] select[name=subjectId]", { label: "E2E Subject" });
  await admin.selectOption("form[data-test=create-assessment] select[name=cadence]", "ANNUAL");
  await admin.click("form[data-test=create-assessment] button[type=submit]");
  await expect(admin.getByRole("heading", { name: title })).toBeVisible();
  await admin.fill("form[data-test=add-question] input[name=text]", "Proctored question");
  await admin.fill("form[data-test=add-question] input[name=options]", "A|B");
  await admin.fill("form[data-test=add-question] input[name=correct]", "2");
  await admin.click("form[data-test=add-question] button[type=submit]");
  await expect(admin.getByRole("heading", { name: "Questions (1)" })).toBeVisible();
  await admin.getByLabel(/Proctored mode/).check();
  await admin.getByLabel("Violations allowed before the attempt is submitted").fill("2");
  await admin.getByRole("button", { name: "Save settings" }).click();
  await expect(admin.getByRole("status")).toHaveText("Settings saved");
  await admin.click("form[data-test=publish-assessment] button[type=submit]");
  await admin.selectOption("select[name=targetType]", "ALL");
  await admin.click("button:has-text('Save assignment')");
  await expect(admin.getByText("Assignment saved")).toBeVisible();

  const learner = await browser.newPage();
  await signIn(learner, "employee@example.test");
  await learner.goto("/learn/assessments");
  await learner.locator("li", { hasText: title }).getByRole("button", { name: "Start" }).click();
  await expect(learner.getByText("This is a proctored assessment")).toBeVisible();
  await expect(learner.getByText("Proctored question")).toBeHidden();

  await learner.getByRole("button", { name: "Enter full screen and start" }).click();
  await expect(learner.getByText("Proctored question")).toBeVisible();
  await learner.getByLabel("B").check();

  await learner.evaluate(() => document.exitFullscreen());
  await expect(learner.getByText("You left the test window (1 of 2 allowed)")).toBeVisible();
  await expect(learner.getByText("Proctored question")).toBeHidden();
  await learner.getByRole("button", { name: "Return to full screen" }).click();
  await expect(learner.getByText("Proctored question")).toBeVisible();

  await learner.evaluate(() => document.exitFullscreen());
  // The answer chosen before the second exit is submitted as it stands.
  await expect(learner.getByText("Score: 100%")).toBeVisible();
});
