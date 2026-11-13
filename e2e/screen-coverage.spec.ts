import { test, expect, type Browser, type Page } from "@playwright/test";
import { TEST_PASSWORD, runDb } from "./db";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

test("the audit log shows recorded changes", async ({ page }) => {
  await signIn(page, "admin@example.test");
  await page.goto("/admin/subjects");
  await page.fill("form[data-test=create-subject] input[name=name]", `Audit ${Date.now()}`);
  await page.click("form[data-test=create-subject] button[type=submit]");
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "subject.create" }).first()).toBeVisible();
});

test("a lab's checklist is ticked off and completes the lesson", async ({ page, browser }: { page: Page; browser: Browser }) => {
  await signIn(page, "admin@example.test");
  await page.goto("/admin/courses");
  const title = `Lab course ${Date.now()}`;
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.fill("form[data-test=add-lesson] input[name=title]", "Set up the lab");
  await page.selectOption("form[data-test=add-lesson] select[name=type]", "LAB");
  await page.fill("form[data-test=add-lesson] textarea[name=body]", "Follow the steps.\n- [ ] Create the VLAN\n- [ ] Test connectivity");
  await page.click("form[data-test=add-lesson] button[type=submit]");
  await expect(page.getByText("Lesson added")).toBeVisible();
  await page.click("form[data-test=publish] button[type=submit]");

  const ctx = await browser.newContext();
  const learner = await ctx.newPage();
  await signIn(learner, "employee@example.test");
  await learner.goto("/learn/catalogue");
  await learner.getByRole("link", { name: title }).click();
  await learner.getByLabel("Create the VLAN").check();
  await learner.getByLabel("Test connectivity").check();
  await learner.click("button:has-text('Save lab progress')");
  await expect(learner.getByText("Progress: 100%")).toBeVisible();
  await ctx.close();
});

test("a live session is booked, and shows on the learner's home page", async ({ page, browser }: { page: Page; browser: Browser }) => {
  await signIn(page, "admin@example.test");
  await page.goto("/admin/courses");
  const title = `Live course ${Date.now()}`;
  await page.fill("form[data-test=create-course] input[name=title]", title);
  await page.selectOption("form[data-test=create-course] select[name=subjectId]", { label: "E2E Subject" });
  await page.click("form[data-test=create-course] button[type=submit]");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const lessonTitle = `Session ${Date.now()}`;
  await page.fill("form[data-test=add-lesson] input[name=title]", lessonTitle);
  await page.selectOption("form[data-test=add-lesson] select[name=type]", "LIVE_SESSION");
  await page.click("form[data-test=add-lesson] button[type=submit]");
  await expect(page.getByText("Lesson added")).toBeVisible();
  await page.click("form[data-test=publish] button[type=submit]");
  const schedule = page.locator(`form:has(input[name=lessonId][value="${runDb(["lesson-id", lessonTitle])}"])`);
  await schedule.locator("input[name=startsAt]").fill("2030-06-01T10:00");
  await schedule.locator("input[name=endsAt]").fill("2030-06-01T11:00");
  await schedule.locator("input[name=meetingUrl]").fill("https://meet.example.test/session");
  await schedule.locator("button:has-text('Save session')").click();
  await expect(page.getByText("Session scheduled")).toBeVisible();

  const ctx = await browser.newContext();
  const learner = await ctx.newPage();
  await signIn(learner, "employee@example.test");
  await learner.goto("/learn/catalogue");
  await learner.getByRole("link", { name: title }).click();
  await learner.getByRole("button", { name: "Register for this session" }).click();
  await expect(learner.getByText("You are registered")).toBeVisible();
  await learner.goto("/learn");
  await expect(learner.getByRole("heading", { name: "Upcoming live sessions" })).toBeVisible();
  await expect(learner.getByText(lessonTitle)).toBeVisible();
  await ctx.close();
});

test("a certificate can be verified publicly and downloaded by its holder", async ({ browser }) => {
  const [certId, code] = runDb(["issue-cert"]).split(" ");
  const ctx = await browser.newContext();
  const learner = await ctx.newPage();
  await signIn(learner, "employee@example.test");
  await learner.goto("/learn/certifications");
  await expect(learner.getByRole("heading", { name: "My certifications" })).toBeVisible();
  await expect(learner.getByText(code)).toBeVisible();
  const pdf = await learner.request.get(`/api/certificates/${certId}`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  await ctx.close();

  const anon = await browser.newContext();
  const visitor = await anon.newPage();
  await visitor.goto(`/verify/${code}`);
  await expect(visitor.getByRole("heading", { name: "Valid certificate" })).toBeVisible();
  await expect(visitor.getByText(/score/i)).toHaveCount(0);
  await anon.close();
});
