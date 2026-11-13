import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./client";

// Integration test against the real database (DATABASE_URL must point at lms_test).
describe("schema: one assessment period per user, assessment, and period key", () => {
  const tag = `schema-test-${Date.now()}`;
  let subjectId: string;
  let userId: string;
  let assessmentId: string;

  beforeAll(async () => {
    const subject = await prisma.subject.create({
      data: { name: `${tag}-subject`, slug: `${tag}-subject`, category: "TECHNICAL" },
    });
    subjectId = subject.id;
    const user = await prisma.user.create({
      data: { name: "Schema Test", email: `${tag}@example.test`, passwordHash: "x", role: "EMPLOYEE" },
    });
    userId = user.id;
    const assessment = await prisma.assessment.create({
      data: {
        subjectId,
        title: `${tag} assessment`,
        cadence: "WEEKLY",
        level: "BASIC",
        passMarkPercent: 70,
      },
    });
    assessmentId = assessment.id;
  });

  afterAll(async () => {
    await prisma.assessmentPeriod.deleteMany({ where: { assessmentId } });
    await prisma.assessment.deleteMany({ where: { id: assessmentId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.$disconnect();
  });

  it("rejects a second period row for the same assessment, user, and period key", async () => {
    const data = {
      assessmentId,
      userId,
      periodKey: "2026-W46",
      opensAt: new Date("2026-11-09T00:00:00Z"),
      dueAt: new Date("2026-11-15T23:59:59.999Z"),
    };
    await prisma.assessmentPeriod.create({ data });
    await expect(prisma.assessmentPeriod.create({ data })).rejects.toThrow(/Unique constraint/i);
  });
});
