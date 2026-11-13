import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { completeLesson, saveLessonPosition, videoRuleMet, watchIncrement } from "./progress";
import { startAttempt, submitAttempt } from "../assessments/take";

describe("completion rule helpers", () => {
  it("counts small forward steps as watched, never skips or rewinds", () => {
    expect(watchIncrement(10, 15)).toBe(5);
    expect(watchIncrement(10, 25)).toBe(15);
    expect(watchIncrement(10, 26)).toBe(0); // skipped ahead
    expect(watchIncrement(30, 10)).toBe(0); // rewound
  });

  it("checks the minimum watched share", () => {
    expect(videoRuleMet(0, 0, null)).toEqual({ ok: true });
    expect(videoRuleMet(90, 0, null)).toMatchObject({ ok: false });
    expect(videoRuleMet(90, 89, 100)).toEqual({ ok: false, error: "Watch at least 90% of the video first (you have watched 89%)" });
    expect(videoRuleMet(90, 90, 100)).toEqual({ ok: true });
  });
});

describe("course completion rules", () => {
  const tag = `rules-${Date.now()}`;
  let learner: SessionUser;
  let subjectId: string;
  let courseId: string;
  let videoId: string;
  let textId: string;
  let periodId: string;
  let questionId: string;

  beforeAll(async () => {
    const u = await prisma.user.create({ data: { name: "L", email: `${tag}@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
    learner = { id: u.id, role: "EMPLOYEE", active: true, name: "L", email: u.email, department: null };
    subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "TECHNICAL" } })).id;
    const course = await prisma.course.create({
      data: {
        subjectId, title: `${tag} course`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED",
        minVideoWatchPercent: 90, requireAssessmentPass: true,
        lessons: { create: [
          { position: 1, title: "Video", type: "VIDEO", fileKey: "x.mp4", captionFileKey: "x.vtt" },
          { position: 2, title: "Text", type: "TEXT", body: "x" },
        ] },
      },
      include: { lessons: { orderBy: { position: "asc" } } },
    });
    courseId = course.id;
    [videoId, textId] = course.lessons.map((l) => l.id);
    const assessment = await prisma.assessment.create({
      data: { subjectId, courseId, title: `${tag} check`, cadence: "ONE_TIME", level: "BASIC", passMarkPercent: 70, published: true, retakeDelayHours: 0,
        questions: { create: { position: 1, type: "SINGLE", text: "Pick B", options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }], correctOptionIds: ["o2"], points: 1 } } },
      include: { questions: true },
    });
    questionId = assessment.questions[0].id;
    periodId = (await prisma.assessmentPeriod.create({
      data: { assessmentId: assessment.id, userId: learner.id, periodKey: "once", opensAt: new Date("2026-01-01Z"), dueAt: new Date("2099-01-01Z") },
    })).id;
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { actorId: learner.id } });
    await prisma.certification.deleteMany({ where: { userId: learner.id } });
    await prisma.assessment.deleteMany({ where: { subjectId } });
    await prisma.course.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { id: learner.id } });
    await prisma.$disconnect();
  });

  it("refuses to complete a video until 90% was actually played; skipping ahead does not count", async () => {
    expect(await completeLesson(learner, videoId)).toMatchObject({ ok: false });
    await saveLessonPosition(learner, videoId, 95, 100); // jumped straight to the end
    expect(await completeLesson(learner, videoId)).toMatchObject({ ok: false, error: expect.stringContaining("watched 0%") });
    for (let t = 5; t <= 100; t += 5) await saveLessonPosition(learner, videoId, t, 100);
    expect(await completeLesson(learner, videoId)).toEqual({ ok: true });
  });

  it("does not complete the course on its lessons alone when a pass is required", async () => {
    expect(await completeLesson(learner, textId)).toEqual({ ok: true });
    const progress = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: learner.id, courseId } } });
    expect((progress?.completedLessonIds as string[]).length).toBe(2);
    expect(progress?.completedAt).toBeNull();
  });

  it("completes the course when the linked assessment is passed", async () => {
    const now = new Date();
    const failed = await startAttempt(learner, periodId, { now });
    await submitAttempt(learner, failed.attemptId, { [questionId]: ["o1"] }, { now });
    // The fail opened a remedial plan and cleared the lessons; redo them, then pass.
    for (let t = 5; t <= 100; t += 5) await saveLessonPosition(learner, videoId, t, 100);
    await saveLessonPosition(learner, videoId, 0, 100);
    for (let t = 5; t <= 100; t += 5) await saveLessonPosition(learner, videoId, t, 100);
    expect(await completeLesson(learner, videoId)).toEqual({ ok: true });
    expect(await completeLesson(learner, textId)).toEqual({ ok: true });
    const passed = await startAttempt(learner, periodId, { now });
    expect(await submitAttempt(learner, passed.attemptId, { [questionId]: ["o2"] }, { now })).toMatchObject({ passed: true });
    expect((await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: learner.id, courseId } } }))?.completedAt).not.toBeNull();
  });
});
