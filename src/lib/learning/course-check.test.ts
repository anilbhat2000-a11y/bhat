import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { courseCheckFor, openCourseCheck } from "./course-check";
import { completeLessonForUser } from "./progress";
import { startAttempt, submitAttempt } from "../assessments/take";

const tag = `check-${Date.now()}`;
let learner: SessionUser;
let subjectId: string;
let courseId: string;
let lessonIds: string[];
let questionId: string;

beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: "L", email: `${tag}@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  learner = { id: u.id, role: "EMPLOYEE", active: true, name: "L", email: u.email, department: null };
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "BUSINESS" } })).id;
  const c = await prisma.course.create({
    data: { subjectId, title: `${tag} c`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED",
      lessons: { create: [{ position: 1, title: "A", type: "TEXT", body: "x" }, { position: 2, title: "B", type: "TEXT", body: "y" }] } },
    include: { lessons: { orderBy: { position: "asc" } } },
  });
  courseId = c.id;
  lessonIds = c.lessons.map((l) => l.id);
  const a = await prisma.assessment.create({
    data: { subjectId, courseId, title: `${tag} check`, cadence: "ONE_TIME", level: "BASIC", passMarkPercent: 70, published: true,
      questions: { create: { position: 1, type: "SINGLE", text: "Pick B", options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }], correctOptionIds: ["o2"], points: 1 } } },
    include: { questions: true },
  });
  questionId = a.questions[0].id;
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { actorId: learner.id } });
  await prisma.certification.deleteMany({ where: { userId: learner.id } });
  await prisma.assessment.deleteMany({ where: { subjectId } });
  await prisma.course.deleteMany({ where: { subjectId } });
  await prisma.subject.delete({ where: { id: subjectId } });
  await prisma.user.delete({ where: { id: learner.id } });
  await prisma.$disconnect();
});

it("stays locked until every lesson is done", async () => {
  expect(await courseCheckFor(learner.id, courseId)).toMatchObject({ ready: false, passed: false, attemptsUsed: 0 });
  expect(await openCourseCheck(learner, courseId)).toEqual({ ok: false, error: "Finish every lesson before taking the completion check" });
  await completeLessonForUser(learner.id, lessonIds[0]);
  expect((await openCourseCheck(learner, courseId)).ok).toBe(false);
});

it("opens one period for the learner once the lessons are done, without any admin assignment", async () => {
  for (const id of lessonIds) await completeLessonForUser(learner.id, id);
  const first = await openCourseCheck(learner, courseId);
  const again = await openCourseCheck(learner, courseId);
  expect(first.ok && again.ok && first.periodId === again.periodId).toBe(true);
  expect(await prisma.assessmentAssignment.count({ where: { assessment: { courseId } } })).toBe(0);
});

it("records a pass and the best score", async () => {
  const opened = await openCourseCheck(learner, courseId);
  if (!opened.ok) throw new Error(opened.error);
  const a = await startAttempt(learner, opened.periodId);
  expect((await courseCheckFor(learner.id, courseId))?.inProgressAttemptId).toBe(a.attemptId);
  await submitAttempt(learner, a.attemptId, { [questionId]: ["o2"] });
  expect(await courseCheckFor(learner.id, courseId)).toMatchObject({ passed: true, bestScore: 100, attemptsUsed: 1 });
});

it("is refused for a course with no check or one that is not published", async () => {
  const draft = await prisma.course.create({ data: { subjectId, title: `${tag} draft`, level: "BASIC", passMarkPercent: 70 } });
  expect(await openCourseCheck(learner, draft.id)).toEqual({ ok: false, error: "This course is not available" });
  expect(await courseCheckFor(learner.id, draft.id)).toBeNull();
});
