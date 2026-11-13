import { test, expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./db";

// Acceptance: the system works with the internet disconnected. Every request that is not
// to the LMS itself is blocked and recorded; the pages must load and none may be attempted.
async function blockExternal(page: Page): Promise<string[]> {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return route.continue();
    external.push(url.href);
    return route.abort();
  });
  return external;
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

const PAGES: [string, string[]][] = [
  ["admin@example.test", ["/admin", "/admin/users", "/admin/courses", "/admin/assessments", "/admin/dashboard", "/admin/grading", "/admin/audit"]],
  ["manager@example.test", ["/manager", "/manager/team", "/manager/team/summary"]],
  ["employee@example.test", ["/learn", "/learn/catalogue", "/learn/assessments", "/learn/certifications", "/learn/profile"]],
];

for (const [email, paths] of PAGES) {
  test(`${email.split("@")[0]} pages load with no request outside the LMS`, async ({ page }) => {
    const external = await blockExternal(page);
    await signIn(page, email);
    for (const path of paths) {
      const response = await page.goto(path);
      expect(response?.ok(), path).toBe(true);
      await expect(page.locator("h1").first()).toBeVisible();
    }
    expect(external).toEqual([]);
  });
}
