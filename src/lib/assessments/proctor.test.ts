import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { startAttempt, submitAttempt } from "./take";
import { recordProctorEvent } from "./proctor";

describe("proctoring events", () => {
  const tag = `proctor-${Date.now()}`;
  const NOW = new Date("2026-11-10T10:00:00Z");
  let learner: SessionUser;
  let other: SessionUser;
  let subjectId: string;
  let proctoredId: string;
  let plainId: string;

  const period = async (assessmentId: string, userId: string) => (await prisma.assessmentPeriod.create({
    data: { assessmentId, userId, periodKey: `${Math.random()}`, opensAt: new Date("2026-11-01T00:00:00Z"), dueAt: new Date("2026-11-30T00:00:00Z") },
  })).id;

  beforeAll(async () => {
    const mk = async (n: string): Promise<SessionUser> => {
      const u = await prisma.user.create({ data: { name: n, email: `${tag}-${n}@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
      return { id: u.id, role: "EMPLOYEE", active: true, name: n, email: u.email, department: null };
    };
    learner = await mk("l");
    other = await mk("o");
    subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
    const q = { position: 1, type: "SINGLE" as const, text: "Q", options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }], correctOptionIds: ["o2"], points: 1 };
    proctoredId = (await prisma.assessment.create({
      data: { subjectId, title: "Annual", cadence: "ANNUAL", level: "ADVANCED", passMarkPercent: 70, published: true, proctored: true, proctorMaxViolations: 2, retakeDelayHours: 0, questions: { create: q } },
    })).id;
    plainId = (await prisma.assessment.create({
      data: { subjectId, title: "Weekly", cadence: "WEEKLY", level: "BASIC", passMarkPercent: 70, published: true, questions: { create: q } },
    })).id;
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { actorId: learner.id } });
    await prisma.assessment.deleteMany({ where: { subjectId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("counts violations and asks for a submit at the limit", async () => {
    const a = await startAttempt(learner, await period(proctoredId, learner.id), { now: NOW });
    expect(await recordProctorEvent(learner, a.attemptId, "tab-hidden", NOW)).toEqual({ recorded: true, count: 1, limit: 2, mustSubmit: false });
    expect(await recordProctorEvent(learner, a.attemptId, "fullscreen-exit", NOW)).toEqual({ recorded: true, count: 2, limit: 2, mustSubmit: true });
    const row = await prisma.assessmentAttempt.findUnique({ where: { id: a.attemptId } });
    expect((row?.proctorEvents as { type: string }[]).map((e) => e.type)).toEqual(["tab-hidden", "fullscreen-exit"]);
  });

  it("ignores unknown event types, finished attempts, and assessments that are not proctored", async () => {
    const a = await startAttempt(learner, await period(proctoredId, learner.id), { now: NOW });
    expect((await recordProctorEvent(learner, a.attemptId, "anything", NOW)).recorded).toBe(false);
    await submitAttempt(learner, a.attemptId, {}, { now: NOW });
    expect((await recordProctorEvent(learner, a.attemptId, "tab-hidden", NOW)).recorded).toBe(false);
    const b = await startAttempt(learner, await period(plainId, learner.id), { now: NOW });
    expect((await recordProctorEvent(learner, b.attemptId, "tab-hidden", NOW)).recorded).toBe(false);
  });

  it("refuses events on someone else's attempt", async () => {
    const a = await startAttempt(learner, await period(proctoredId, learner.id), { now: NOW });
    await expect(recordProctorEvent(other, a.attemptId, "tab-hidden", NOW)).rejects.toThrow();
  });
});
