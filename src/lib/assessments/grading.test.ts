import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { attemptForUser, startAttempt, submitAttempt } from "./take";
import { attemptForGrading, gradeAttempt, gradingQueue } from "./grading";

const tag = `grading-${Date.now()}`;
const NOW = new Date("2026-11-10T10:00:00Z");
let learner: SessionUser;
let admin: SessionUser;
let subjectId: string;
let assessmentId: string;

async function freshPeriod(key: string) {
  return (await prisma.assessmentPeriod.create({
    data: { assessmentId, userId: learner.id, periodKey: key, opensAt: new Date("2026-11-01T00:00:00Z"), dueAt: new Date("2026-11-30T23:59:59Z") },
  })).id;
}

beforeAll(async () => {
  const l = await prisma.user.create({ data: { name: "Learner", email: `${tag}-l@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  learner = { id: l.id, role: "EMPLOYEE", active: true, name: "Learner", email: l.email, department: null };
  const a = await prisma.user.create({ data: { name: "Reviewer", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } });
  admin = { id: a.id, role: "ADMIN", active: true, name: "Reviewer", email: a.email, department: null };
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "BUSINESS" } })).id;
  assessmentId = (await prisma.assessment.create({
    data: { subjectId, title: "Mixed", cadence: "MONTHLY", level: "BASIC", passMarkPercent: 60, published: true, showAnswersAfterSubmit: true },
  })).id;
  await prisma.question.createMany({
    data: [
      { assessmentId, position: 1, type: "SINGLE", text: "Pick B", options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }], correctOptionIds: ["o2"], points: 2 },
      { assessmentId, position: 2, type: "FILL_BLANK", text: "A ____ joins networks", options: [{ id: "o1", label: "router" }], correctOptionIds: ["o1"], points: 1 },
      { assessmentId, position: 3, type: "MATCHING", text: "Match", options: [{ id: "o1", label: "Switch", match: "L2" }, { id: "o2", label: "Router", match: "L3" }], correctOptionIds: ["o1", "o2"], points: 2 },
      { assessmentId, position: 4, type: "SHORT_ANSWER", text: "Explain BANT", options: [], correctOptionIds: [], points: 5, explanation: "Budget, authority, need, timeline", scenario: "A new lead calls." },
    ],
  });
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { actorId: { in: [learner.id, admin.id] } } });
  await prisma.certification.deleteMany({ where: { userId: learner.id } });
  await prisma.assessment.deleteMany({ where: { id: assessmentId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("attempts with short answers", () => {
  let attemptId: string;

  it("never sends fill-in-the-blank answers to the learner, and shuffles matching choices", async () => {
    const periodId = await freshPeriod("2026-11-a");
    const started = await startAttempt(learner, periodId, { now: NOW });
    attemptId = started.attemptId;
    const fill = started.questions.find((q) => q.type === "FILL_BLANK");
    expect(fill?.options).toEqual([]);
    const match = started.questions.find((q) => q.type === "MATCHING");
    expect(match?.options.map((o) => o.label)).toEqual(["Switch", "Router"]);
    expect(match?.choices?.map((c) => c.label).sort()).toEqual(["L2", "L3"]);
    expect(JSON.stringify(match?.options)).not.toContain("L2");
    expect(started.questions.find((q) => q.type === "SHORT_ANSWER")?.scenario).toBe("A new lead calls.");
  });

  it("holds the result for a reviewer instead of scoring it, and issues no certificate yet", async () => {
    const qs = await prisma.question.findMany({ where: { assessmentId }, orderBy: { position: "asc" } });
    const r = await submitAttempt(learner, attemptId, {
      [qs[0].id]: ["o2"], [qs[1].id]: [" Router "], [qs[2].id]: ["o1=o1", "o2=o2"], [qs[3].id]: ["Budget and need"],
    }, { now: NOW });
    expect(r).toMatchObject({ ok: true, awaitingGrading: true, scorePercent: null, passed: null });
    const row = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
    expect(row?.status).toBe("AWAITING_GRADING");
    expect(await prisma.certification.count({ where: { userId: learner.id } })).toBe(0);
    expect((await attemptForUser(learner, attemptId))?.answerKey).toBeUndefined();
  });

  it("lists the attempt in the queue, and shows the reviewer each answer and the model answer", async () => {
    const queue = await gradingQueue(admin);
    expect(queue.some((q) => q.id === attemptId && q.learner === "Learner")).toBe(true);
    const view = await attemptForGrading(admin, attemptId);
    const short = view?.items.find((i) => i.manual);
    expect(short).toMatchObject({ answer: ["Budget and need"], modelAnswer: "Budget, authority, need, timeline", correct: null });
    expect(view?.items.filter((i) => !i.manual).every((i) => i.correct === true)).toBe(true);
  });

  it("refuses employees, the learner's own attempt, and marks out of range", async () => {
    await expect(gradingQueue(learner)).rejects.toThrow();
    const short = await prisma.question.findFirst({ where: { assessmentId, type: "SHORT_ANSWER" } });
    expect(await gradeAttempt(admin, attemptId, {}, "")).toMatchObject({ ok: false });
    expect(await gradeAttempt(admin, attemptId, { [short!.id]: { points: 6 } }, "")).toMatchObject({ ok: false });
    expect(await gradeAttempt(admin, attemptId, { [short!.id]: { points: 2.5 } }, "")).toMatchObject({ ok: false });
  });

  it("finalises the score with the reviewer's mark, issues the certificate, and records notes", async () => {
    const short = await prisma.question.findFirst({ where: { assessmentId, type: "SHORT_ANSWER" } });
    // Objective 5 of 5, plus 2 of 5: 7 of 10 = 70%, above the 60% pass mark.
    const r = await gradeAttempt(admin, attemptId, { [short!.id]: { points: 2, note: "Missed authority and timeline" } }, "Good effort", NOW);
    expect(r).toEqual({ ok: true, scorePercent: 70, passed: true });
    const row = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId }, include: { period: true } });
    expect(row).toMatchObject({ status: "SUBMITTED", reviewerNote: "Good effort", gradedById: admin.id });
    expect(row?.period.status).toBe("PASSED");
    expect(await prisma.certification.count({ where: { userId: learner.id, sourceAttemptId: attemptId } })).toBe(1);
    const shown = await attemptForUser(learner, attemptId);
    expect(shown?.answerKey?.find((k) => k.text === "Explain BANT")?.reviewerNote).toBe("Missed authority and timeline");
    expect(await prisma.auditEvent.count({ where: { action: "attempt.grade", entityId: attemptId } })).toBe(1);
  });

  it("cannot be graded twice", async () => {
    const short = await prisma.question.findFirst({ where: { assessmentId, type: "SHORT_ANSWER" } });
    expect(await gradeAttempt(admin, attemptId, { [short!.id]: { points: 5 } }, "")).toMatchObject({ ok: false });
    expect(await prisma.certification.count({ where: { userId: learner.id } })).toBe(1);
  });

  it("does not let an admin grade their own attempt", async () => {
    const own = await prisma.assessmentPeriod.create({
      data: { assessmentId, userId: admin.id, periodKey: "2026-11-own", opensAt: new Date("2026-11-01T00:00:00Z"), dueAt: new Date("2026-11-30T23:59:59Z") },
    });
    const started = await startAttempt(admin, own.id, { now: NOW });
    await submitAttempt(admin, started.attemptId, {}, { now: NOW });
    const short = await prisma.question.findFirst({ where: { assessmentId, type: "SHORT_ANSWER" } });
    expect(await gradeAttempt(admin, started.attemptId, { [short!.id]: { points: 5 } }, "")).toEqual({ ok: false, error: "You cannot grade your own attempt" });
    expect((await gradingQueue(admin)).find((q) => q.id === started.attemptId)?.canGrade).toBe(false);
  });
});
