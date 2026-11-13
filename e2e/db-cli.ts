// Database helper for end-to-end tests. Run through tsx (ESM-capable), never imported
// directly by the Playwright process, which loads modules as CommonJS.
import { prisma } from "../src/lib/db/client";
import { hashPassword } from "../src/lib/auth/password";

const TEST_PASSWORD = "Test-pass-1";
const USERS = [
  { name: "Test Admin", email: "admin@example.test", role: "ADMIN" as const },
  { name: "Test Manager", email: "manager@example.test", role: "MANAGER" as const },
  { name: "Test Employee", email: "employee@example.test", role: "EMPLOYEE" as const },
  { name: "Test Leaver", email: "leaver@example.test", role: "EMPLOYEE" as const },
];

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === "seed") {
    const passwordHash = await hashPassword(TEST_PASSWORD);
    for (const u of USERS) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role, passwordHash, active: true },
        create: { ...u, passwordHash },
      });
    }
    const manager = await prisma.user.findUnique({ where: { email: "manager@example.test" } });
    if (manager) {
      await prisma.user.update({ where: { email: "employee@example.test" }, data: { managerId: manager.id } });
    }
    await prisma.subject.upsert({
      where: { slug: "e2e-subject" },
      update: {},
      create: { name: "E2E Subject", slug: "e2e-subject", category: "TECHNICAL" },
    });
  } else if (command === "set-active") {
    const [email, value] = args;
    await prisma.user.update({ where: { email }, data: { active: value === "true" } });
  } else {
    throw new Error(`unknown command: ${command}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
