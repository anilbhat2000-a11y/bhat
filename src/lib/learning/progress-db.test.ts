import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { completeLesson, saveLessonPosition, lastLessonFor, listCatalogue } from "./progress";

const tag = `progress-${Date.now()}`;
const learner: SessionUser = { id: "", role: "EMPLOYEE", active: true, name: "L", email: "", department: null };
let subjectId: string;
let courseId: string;
let draftCourseId: string;
let lessonIds: string[] = [];
let draftLessonId: string;

beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: "L", email: `${tag}-l@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  learner.id = u.id; learner.email = u.email;
  const s = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "BUSINESS" } });
  subjectId = s.id;
  const c = await prisma.course.create({ data: { subjectId, title: "Pub", level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } });
  courseId = c.id;
  for (let i = 1; i <= 3; i++) {
    const l = await prisma.lesson.create({ data: { courseId, position: i, title: `L${i}`, type: "VIDEO", fileKey: null } });
    lessonIds.push(l.id);
  }
  const d = await prisma.course.create({ data: { subjectId, title: "Draft", level: "BASIC", passMarkPercent: 70, status: "DRAFT" } });
  draftCourseId = d.id;
  draftLessonId = (await prisma.lesson.create({ data: { courseId: draftCourseId, position: 1, title: "D1", type: "TEXT", body: "x" } })).id;
});

afterAll(async () => {
  await prisma.lessonProgress.deleteMany({ where: { userId: learner.id } });
  await prisma.courseProgress.deleteMany({ where: { userId: learner.id } });
  await prisma.course.deleteMany({ where: { subjectId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("learner progress", () => {
  it("refuses to complete a lesson in an unpublished course", async () => {
    expect((await completeLesson(learner, draftLessonId)).ok).toBe(false);
  });

  it("refuses to skip ahead: lesson 2 before lesson 1 (spec: in order)", async () => {
    const r = await completeLesson(learner, lessonIds[1]);
    expect(r.ok).toBe(false);
  });

  it("completes lessons in order and marks the course done after the last", async () => {
    expect((await completeLesson(learner, lessonIds[0])).ok).toBe(true);
    expect((await completeLesson(learner, lessonIds[1])).ok).toBe(true);
    expect((await completeLesson(learner, lessonIds[2])).ok).toBe(true);
    const cp = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: learner.id, courseId } } });
    expect(cp?.completedAt).not.toBeNull();
  });

  it("saves a video position and returns the lesson for resume (spec 6B)", async () => {
    await saveLessonPosition(learner, lessonIds[2], 95);
    const lp = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: learner.id, lessonId: lessonIds[2] } } });
    expect(lp?.positionSeconds).toBe(95);
    expect(await lastLessonFor(learner.id, courseId)).toBe(lessonIds[2]);
  });

  it("refuses a negative position", async () => {
    await expect(saveLessonPosition(learner, lessonIds[0], -1)).rejects.toThrow(/negative/i);
  });

  it("the catalogue lists published courses only, grouped by category", async () => {
    const groups = await listCatalogue(learner);
    const titles = groups.flatMap((g) => g.courses.map((c) => c.title));
    expect(titles).toContain("Pub");
    expect(titles).not.toContain("Draft");
  });
});
