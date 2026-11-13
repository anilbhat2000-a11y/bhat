import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { startAttempt, submitAttempt } from "./take";

const tag = `take-${Date.now()}`;
let learner: SessionUser;
let other: SessionUser;
let subjectId: string;
let assessmentId: string;
let periodId: string;
let poolAssessmentId: string;
let poolPeriodId: string;
let timedAssessmentId: string;
let timedPeriodId: string;
const PERIOD_KEY = "2026-11";

const seqRng = (values: number[]) => { let i = 0; return () => values[i++ % values.length]; };

async function makeQuestions(assessment: string, count: number) {
  for (let i = 1; i <= count; i++) {
    await prisma.question.create({
      data: {
        assessmentId: assessment, position: i, type: "SINGLE", text: `Q${i}`,
        options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }],
        correctOptionIds: ["o2"], points: 1,
      },
    });
  }
}

beforeAll(async () => {
  const l = await prisma.user.create({ data: { name: "L", email: `${tag}-l@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  learner = { id: l.id, role: "EMPLOYEE", active: true, name: "L", email: l.email, department: null };
  const o = await prisma.user.create({ data: { name: "O", email: `${tag}-o@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  other = { id: o.id, role: "EMPLOYEE", active: true, name: "O", email: o.email, department: null };
  const s = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL", certificationValidityMonths: 12 } });
  subjectId = s.id;

  const a = await prisma.assessment.create({
    data: { subjectId, title: "A", cadence: "MONTHLY", level: "BASIC", passMarkPercent: 70, published: true, maxAttemptsPerPeriod: 3, retakeDelayHours: 0 },
  });
  assessmentId = a.id;
  await makeQuestions(assessmentId, 2);
  const p = await prisma.assessmentPeriod.create({
    data: { assessmentId, userId: learner.id, periodKey: PERIOD_KEY, opensAt: new Date("2026-11-01T00:00:00Z"), dueAt: new Date("2026-11-30T23:59:59.999Z") },
  });
  periodId = p.id;

  const pool = await prisma.assessment.create({
    data: { subjectId, title: "Pool", cadence: "MONTHLY", level: "BASIC", passMarkPercent: 50, published: true, questionsPerAttempt: 3, retakeDelayHours: 0 },
  });
  poolAssessmentId = pool.id;
  await makeQuestions(poolAssessmentId, 5);
  poolPeriodId = (await prisma.assessmentPeriod.create({
    data: { assessmentId: poolAssessmentId, userId: learner.id, periodKey: PERIOD_KEY, opensAt: new Date("2026-11-01T00:00:00Z"), dueAt: new Date("2026-11-30T23:59:59.999Z") },
  })).id;

  const timed = await prisma.assessment.create({
    data: { subjectId, title: "Timed", cadence: "MONTHLY", level: "BASIC", passMarkPercent: 50, published: true, timeLimitMinutes: 30 },
  });
  timedAssessmentId = timed.id;
  await makeQuestions(timedAssessmentId, 1);
  timedPeriodId = (await prisma.assessmentPeriod.create({
    data: { assessmentId: timedAssessmentId, userId: learner.id, periodKey: PERIOD_KEY, opensAt: new Date("2026-11-01T00:00:00Z"), dueAt: new Date("2026-11-30T23:59:59.999Z") },
  })).id;
});

afterAll(async () => {
  await prisma.certification.deleteMany({ where: { userId: learner.id } });
  await prisma.assessmentAttempt.deleteMany({ where: { userId: learner.id } });
  await prisma.assessmentPeriod.deleteMany({ where: { userId: learner.id } });
  await prisma.question.deleteMany({ where: { assessment: { subjectId } } });
  await prisma.assessment.deleteMany({ where: { subjectId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("taking an assessment", () => {
  it("refuses to start another user's period", async () => {
    await expect(startAttempt(other, periodId)).rejects.toMatchObject({ status: 403 });
  });

  it("draws a fixed-size pool of distinct questions, deterministically with an injected rng", async () => {
    const r = await startAttempt(learner, poolPeriodId, { rng: seqRng([0.1, 0.5, 0.9]) });
    expect(r.questions).toHaveLength(3);
    expect(new Set(r.questions.map((q) => q.id)).size).toBe(3);
    // The public view never includes the answer key.
    expect(r.questions[0]).not.toHaveProperty("correctOptionIds");
  });

  it("the time limit is inclusive: exactly at the limit is accepted, one millisecond later is refused and recorded as expired", async () => {
    const started = new Date("2026-11-13T10:00:00Z");
    const first = await startAttempt(learner, timedPeriodId, { now: started });
    expect(first.expiresAt?.toISOString()).toBe("2026-11-13T10:30:00.000Z");
    const late = await submitAttempt(learner, first.attemptId, {}, { now: new Date("2026-11-13T10:30:00.001Z") });
    expect(late.ok).toBe(false);
    expect((await prisma.assessmentAttempt.findUnique({ where: { id: first.attemptId } }))?.status).toBe("EXPIRED");

    const second = await startAttempt(learner, timedPeriodId, { now: started });
    const onTime = await submitAttempt(learner, second.attemptId, {}, { now: new Date("2026-11-13T10:30:00Z") });
    expect(onTime.ok).toBe(true);
    // Restore the period for the certification test below.
    await prisma.assessmentPeriod.update({ where: { id: timedPeriodId }, data: { status: "OPEN" } });
  });

  it("a passing submit marks the period PASSED and issues a certification with the subject's validity", async () => {
    const r = await startAttempt(learner, periodId, { now: new Date("2026-11-13T10:00:00Z") });
    const answers = Object.fromEntries(r.questions.map((q) => [q.id, ["o2"]]));
    const done = await submitAttempt(learner, r.attemptId, answers, { now: new Date("2026-11-13T10:05:00Z") });
    expect(done).toMatchObject({ ok: true, passed: true, scorePercent: 100 });
    expect((await prisma.assessmentPeriod.findUnique({ where: { id: periodId } }))?.status).toBe("PASSED");
    const cert = await prisma.certification.findFirst({ where: { userId: learner.id, subjectId } });
    expect(cert?.level).toBe("BASIC");
    expect(cert?.expiresAt.toISOString()).toBe("2027-11-13T10:05:00.000Z");
  });

  it("refuses a second submit of the same attempt", async () => {
    const r = await startAttempt(learner, poolPeriodId, { rng: seqRng([0.2]) });
    await submitAttempt(learner, r.attemptId, {}, { now: new Date() });
    const again = await submitAttempt(learner, r.attemptId, {}, { now: new Date() });
    expect(again).toEqual({ ok: false, error: "This attempt was already submitted" });
  });

  it("refuses a fourth attempt in the same period (limit of 3)", async () => {
    const period = await prisma.assessmentPeriod.create({
      data: { assessmentId: poolAssessmentId, userId: other.id, periodKey: "2026-12", opensAt: new Date("2026-12-01T00:00:00Z"), dueAt: new Date("2026-12-31T23:59:59.999Z") },
    });
    for (let i = 0; i < 3; i++) {
      const r = await startAttempt(other, period.id, { rng: seqRng([0.3]) });
      await submitAttempt(other, r.attemptId, {}, { now: new Date() });
    }
    await expect(startAttempt(other, period.id)).rejects.toThrow(/attempt limit/i);
  });
});
