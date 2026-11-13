import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { openAllPeriods } from "./open-periods";
import { startAttempt, submitAttempt } from "./take";

const tag = `rollover-${Date.now()}`;
let learner: SessionUser;
let assessmentId: string;
let subjectId: string;

beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: "R", email: `${tag}@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  learner = { id: u.id, role: "EMPLOYEE", active: true, name: "R", email: u.email, department: null };
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  assessmentId = (await prisma.assessment.create({
    data: { subjectId, title: `${tag} weekly`, cadence: "WEEKLY", level: "BASIC", passMarkPercent: 50, published: true, maxAttemptsPerPeriod: 5 },
  })).id;
  await prisma.assessmentAssignment.create({ data: { assessmentId, targetType: "USER", targetValue: u.id } });
  await prisma.question.create({ data: { assessmentId, position: 1, type: "SINGLE", text: "Q", options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }], correctOptionIds: ["o2"], points: 1 } });
});

afterAll(async () => {
  await prisma.assessmentAttempt.deleteMany({ where: { userId: learner.id } });
  await prisma.assessmentPeriod.deleteMany({ where: { assessmentId } });
  await prisma.question.deleteMany({ where: { assessmentId } });
  await prisma.assessmentAssignment.deleteMany({ where: { assessmentId } });
  await prisma.assessment.deleteMany({ where: { id: assessmentId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("recurring periods roll over (spec 5, review Critical 2)", () => {
  it("the scheduled rollover opens the new week, and the old week becomes OVERDUE", async () => {
    await openAllPeriods(new Date("2026-11-20T10:00:00Z")); // ISO week 47
    await openAllPeriods(new Date("2026-11-30T10:00:00Z")); // Monday of week 49, after week 47 is due
    const keys = (await prisma.assessmentPeriod.findMany({ where: { assessmentId, userId: learner.id }, orderBy: { periodKey: "asc" } }))
      .map((p) => [p.periodKey, p.status]);
    expect(keys).toEqual([["2026-W47", "OVERDUE"], ["2026-W49", "OPEN"]]);
  });

  it("a period cannot be started after its due time", async () => {
    const past = await prisma.assessmentPeriod.create({
      data: { assessmentId, userId: learner.id, periodKey: "2020-W01", opensAt: new Date("2019-12-30Z"), dueAt: new Date("2020-01-05Z"), status: "OPEN" },
    });
    await expect(startAttempt(learner, past.id, { now: new Date("2026-06-01Z") })).rejects.toThrow(/closed/i);
  });

  it("a submit after the due time is not scored, and the attempt is marked expired", async () => {
    const period = await prisma.assessmentPeriod.create({
      data: { assessmentId, userId: learner.id, periodKey: "2030-W01", opensAt: new Date("2029-12-28Z"), dueAt: new Date("2030-01-06Z"), status: "OPEN" },
    });
    const started = await startAttempt(learner, period.id, { now: new Date("2030-01-05Z") });
    const late = await submitAttempt(learner, started.attemptId, { }, { now: new Date("2030-01-07Z") });
    expect(late.ok).toBe(false);
    expect((await prisma.assessmentAttempt.findUnique({ where: { id: started.attemptId } }))?.status).toBe("EXPIRED");
  });
});
