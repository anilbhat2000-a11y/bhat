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
  } else if (command === "lesson-id") {
    const lesson = await prisma.lesson.findFirst({ where: { title: args[0] } });
    console.log(lesson?.id ?? "");
  } else if (command === "lesson-course-id") {
    const lesson = await prisma.lesson.findFirst({ where: { title: args[0] } });
    console.log(lesson?.courseId ?? "");
  } else if (command === "issue-cert") {
    const user = await prisma.user.findUnique({ where: { email: "employee@example.test" } });
    const subject = await prisma.subject.findUnique({ where: { slug: "e2e-subject" } });
    if (!user || !subject) throw new Error("seed data missing");
    const code = `E2E${Date.now().toString(36).toUpperCase()}`.slice(0, 12).padEnd(12, "X");
    const cert = await prisma.certification.create({
      data: { userId: user.id, subjectId: subject.id, level: "BASIC", issuedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 24 * 3600_000), verificationCode: code },
    });
    console.log(`${cert.id} ${code}`);
  } else if (command === "course-id") {
    const course = await prisma.course.findFirst({ where: { title: args[0] } });
    console.log(course?.id ?? "");
  } else if (command === "check-id") {
    const a = await prisma.assessment.findFirst({ where: { course: { title: args[0] }, cadence: "ONE_TIME" } });
    console.log(a?.id ?? "");
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
