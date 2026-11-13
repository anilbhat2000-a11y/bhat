import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { startAttempt, submitAttempt } from "./take";
import { commentOnRemedial, openRemedialsFor, retakeTime } from "./remedial";
import { completeLessonForUser } from "../learning/progress";
import { resetAttempts } from "./admin";

it("opens the retake after the delay, but no later than the period's due time", () => {
  const now = new Date("2026-11-10T10:00:00Z");
  expect(retakeTime(now, 24, new Date("2026-11-30T00:00:00Z")).toISOString()).toBe("2026-11-11T10:00:00.000Z");
  expect(retakeTime(now, 24, new Date("2026-11-10T20:00:00Z")).toISOString()).toBe("2026-11-10T20:00:00.000Z");
  expect(retakeTime(now, 0, new Date("2026-11-30T00:00:00Z")).toISOString()).toBe(now.toISOString());
});

describe("remedial path after a fail", () => {
  const tag = `remedial-${Date.now()}`;
  const T0 = new Date("2026-11-10T10:00:00Z");
  let learner: SessionUser;
  let manager: SessionUser;
  let outsider: SessionUser;
  let admin: SessionUser;
  let subjectId: string;
  let courseId: string;
  let lessonIds: string[];
  let assessmentId: string;
  let periodId: string;

  const user = async (name: string, role: "EMPLOYEE" | "MANAGER" | "ADMIN", managerId?: string): Promise<SessionUser> => {
    const u = await prisma.user.create({ data: { name, email: `${tag}-${name}@example.test`, passwordHash: "x", role, managerId } });
    return { id: u.id, role, active: true, name, email: u.email, department: null };
  };

  beforeAll(async () => {
    manager = await user("mgr", "MANAGER");
    learner = await user("learner", "EMPLOYEE", manager.id);
    outsider = await user("outsider", "MANAGER");
    admin = await user("admin", "ADMIN");
    subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "BUSINESS" } })).id;
    const course = await prisma.course.create({
      data: { subjectId, title: `${tag} course`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED",
        lessons: { create: [{ position: 1, title: "L1", type: "TEXT", body: "x" }, { position: 2, title: "L2", type: "TEXT", body: "y" }] } },
      include: { lessons: { orderBy: { position: "asc" } } },
    });
    courseId = course.id;
    lessonIds = course.lessons.map((l) => l.id);
    for (const id of lessonIds) await completeLessonForUser(learner.id, id);
    assessmentId = (await prisma.assessment.create({
      data: { subjectId, courseId, title: `${tag} check`, cadence: "ONE_TIME", level: "BASIC", passMarkPercent: 70, published: true, retakeDelayHours: 24,
        questions: { create: { position: 1, type: "SINGLE", text: "Pick B", options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }], correctOptionIds: ["o2"], points: 1 } } },
    })).id;
    periodId = (await prisma.assessmentPeriod.create({
      data: { assessmentId, userId: learner.id, periodKey: "once", opensAt: new Date("2026-11-01T00:00:00Z"), dueAt: new Date("2026-12-31T00:00:00Z") },
    })).id;
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { actorId: { in: [learner.id, manager.id, admin.id] } } });
    await prisma.certification.deleteMany({ where: { userId: learner.id } });
    await prisma.assessment.deleteMany({ where: { id: assessmentId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("opens a plan on a fail and assigns the course's lessons again", async () => {
    expect((await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: learner.id, courseId } } }))?.completedAt).not.toBeNull();
    const a = await startAttempt(learner, periodId, { now: T0 });
    const r = await submitAttempt(learner, a.attemptId, { [a.questions[0].id]: ["o1"] }, { now: T0 });
    expect(r).toMatchObject({ ok: true, passed: false });

    const plans = await openRemedialsFor(learner.id);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ courseId, courseDone: false });
    expect(plans[0].retakeAfter.toISOString()).toBe("2026-11-11T10:00:00.000Z");
    const progress = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: learner.id, courseId } } });
    expect(progress?.completedAt).toBeNull();
    expect(progress?.completedLessonIds).toEqual([]);
  });

  it("blocks the retake until the course is done again, then until the retake time", async () => {
    const later = new Date("2026-11-12T10:00:00Z");
    await expect(startAttempt(learner, periodId, { now: later })).rejects.toThrow(/work through the course/);
    for (const id of lessonIds) await completeLessonForUser(learner.id, id);
    const early = new Date("2026-11-10T12:00:00Z");
    await expect(startAttempt(learner, periodId, { now: early })).rejects.toThrow(/retake opens/);
    const a = await startAttempt(learner, periodId, { now: later });
    expect(a.attemptId).toBeTruthy();
    expect(await openRemedialsFor(learner.id)).toHaveLength(0);
    // Pass it, so later tests start clean.
    expect(await submitAttempt(learner, a.attemptId, { [a.questions[0].id]: ["o2"] }, { now: later })).toMatchObject({ passed: true });
  });

  it("lets the learner's manager comment, but not a manager outside the line or the learner", async () => {
    const plan = await prisma.remedialPlan.findFirstOrThrow({ where: { userId: learner.id } });
    expect(await commentOnRemedial(manager, plan.id, "Approved: revisit module 2 first.")).toEqual({ ok: true });
    expect((await prisma.remedialPlan.findUnique({ where: { id: plan.id } }))?.managerComment).toBe("Approved: revisit module 2 first.");
    await expect(commentOnRemedial(outsider, plan.id, "x")).rejects.toThrow();
    await expect(commentOnRemedial(learner, plan.id, "x")).rejects.toThrow();
    expect(await prisma.auditEvent.count({ where: { action: "remedial.comment", entityId: plan.id } })).toBe(1);
  });

  it("closes an open plan when an admin resets the period", async () => {
    const period = await prisma.assessmentPeriod.create({
      data: { assessmentId, userId: learner.id, periodKey: "again", opensAt: new Date("2026-11-01T00:00:00Z"), dueAt: new Date("2026-12-31T00:00:00Z") },
    });
    const a = await startAttempt(learner, period.id, { now: T0 });
    await submitAttempt(learner, a.attemptId, {}, { now: T0 });
    expect(await openRemedialsFor(learner.id)).toHaveLength(1);
    expect((await resetAttempts(admin, period.id)).ok).toBe(true);
    expect(await openRemedialsFor(learner.id)).toHaveLength(0);
  });
});
