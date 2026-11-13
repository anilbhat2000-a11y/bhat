import { execFileSync } from "node:child_process";

export const TEST_PASSWORD = "Test-pass-1";

// Runs e2e/db-cli.ts through tsx, so the Prisma client loads as ESM.
export function runDb(args: string[]): void {
  execFileSync("npx", ["tsx", "e2e/db-cli.ts", ...args], { stdio: "pipe", env: process.env });
}
