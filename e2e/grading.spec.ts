import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

async function addQuestion(page: Page, count: number, q: { type: string; text: string; options?: string; correct?: string; points?: string; scenario?: string; explanation?: string }) {
  const form = page.locator("form[data-test=add-question]");
  await form.locator("select[name=type]").selectOption(q.type);
  await form.locator("input[name=text]").fill(q.text);
  await form.locator("input[name=options]").fill(q.options ?? "");
  await form.locator("input[name=correct]").fill(q.correct ?? "");
  await form.locator("input[name=points]").fill(q.points ?? "1");
  await form.locator("textarea[name=scenario]").fill(q.scenario ?? "");
  await form.locator("textarea[name=explanation]").fill(q.explanation ?? "");
  await form.locator("button[type=submit]").click();
  // Wait for the reload: the notice from the previous question may still be on screen.
  await expect(page.getByRole("heading", { name: `Questions (${count})` })).toBeVisible();
}

test("fill-in, matching and short-answer questions: the learner waits for a reviewer, who grades them", async ({ browser }) => {
  const admin = await browser.newPage();
  await signIn(admin, "admin@example.test");
  await admin.goto("/admin/assessments");
  const title = `E2E grading ${Date.now()}`;
  await admin.fill("form[data-test=create-assessment] input[name=title]", title);
  await admin.selectOption("form[data-test=create-assessment] select[name=subjectId]", { label: "E2E Subject" });
  await admin.selectOption("form[data-test=create-assessment] select[name=cadence]", "MONTHLY");
  await admin.click("form[data-test=create-assessment] button[type=submit]");
  await expect(admin.getByRole("heading", { name: title })).toBeVisible();

  await addQuestion(admin, 1, { type: "FILL_BLANK", text: "A ____ joins two networks", options: "router" });
  await addQuestion(admin, 2, { type: "MATCHING", text: "Match each device to its layer", options: "Switch=Layer 2|Router=Layer 3", points: "2" });
  await addQuestion(admin, 3, {
    type: "SHORT_ANSWER", text: "Explain how you would qualify this lead", points: "5",
    scenario: "A school asks for 200 laptops by next month.", explanation: "Mention budget, authority, need and timeline.",
  });
  await admin.click("form[data-test=publish-assessment] button[type=submit]");
  await admin.selectOption("select[name=targetType]", "ALL");
  await admin.click("button:has-text('Save assignment')");
  await expect(admin.getByText("Assignment saved")).toBeVisible();

  const learner = await browser.newPage();
  await signIn(learner, "employee@example.test");
  await learner.goto("/learn/assessments");
  await learner.locator("li", { hasText: title }).getByRole("button", { name: "Start" }).click();
  await expect(learner.getByText("A school asks for 200 laptops by next month.")).toBeVisible();
  await learner.getByLabel("Your answer", { exact: true }).fill("Router");
  await learner.getByLabel("Match for Switch").selectOption({ label: "Layer 2" });
  await learner.getByLabel("Match for Router").selectOption({ label: "Layer 3" });
  await learner.getByLabel("Your answer (marked by a reviewer)").fill("Check their budget and who signs off.");
  await learner.click("button:has-text('Submit answers')");
  await expect(learner.getByRole("status")).toContainText("marked by a reviewer");

  await admin.goto("/admin/grading");
  const row = admin.locator("tr", { hasText: title });
  await expect(row).toContainText("Test Employee");
  await row.getByRole("link", { name: "Grade" }).click();
  await expect(admin.getByText("Answer: Check their budget and who signs off.")).toBeVisible();
  await expect(admin.getByText("Model answer: Mention budget, authority, need and timeline.")).toBeVisible();
  await admin.getByLabel("Mark (0 to 5)").fill("3");
  await admin.getByLabel("Note to the learner").fill("Add authority and timeline next time.");
  await admin.click("button:has-text('Save grades')");
  // 1 + 2 + 3 = 6 of 8 points = 75%, at or above the default pass mark.
  await expect(admin.getByRole("status")).toContainText("Graded: 75%");

  await learner.reload();
  await expect(learner.getByText("Score: 75%")).toBeVisible();
});
