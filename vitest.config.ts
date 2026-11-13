import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://lms:lms@localhost:5432/lms_test",
    },
  },
});
