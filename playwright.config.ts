import { defineConfig } from "@playwright/test";

// End-to-end tests run against the test database.
process.env.DATABASE_URL ??= "postgresql://lms:lms@localhost:5432/lms_test";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: process.env.TRACE === "on" ? "on" : "off",
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM_PATH,
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
  },
});
