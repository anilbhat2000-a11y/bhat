import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { completeLesson } from "./progress";
import { markAttendance, scheduleSession } from "./live-sessions";
import { setCoursePublished } from "./courses";

const tag = `chain-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
let learner: SessionUser;
let courseId: string;
let subjectId: string;
let textId: string;
let liveId: string;
let liveSessionId: string;
let unscheduledCourseId: string;

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
  const l = await prisma.user.create({ data: { name: "L", email: `${tag}-l@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  learner = { id: l.id, role: "EMPLOYEE", active: true, name: "L", email: l.email, department: null };
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  courseId = (await prisma.course.create({ data: { subjectId, title: `${tag} c`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } })).id;
  textId = (await prisma.lesson.create({ data: { courseId, position: 1, title: "Reading", type: "TEXT", body: "Read" } })).id;
  liveId = (await prisma.lesson.create({ data: { courseId, position: 2, title: "Live", type: "LIVE_SESSION" } })).id;
  unscheduledCourseId = (await prisma.course.create({ data: { subjectId, title: `${tag} u`, level: "BASIC", passMarkPercent: 70 } })).id;
  await prisma.lesson.create({ data: { courseId: unscheduledCourseId, position: 1, title: "Live later", type: "LIVE_SESSION" } });
  await scheduleSession(admin, liveId, { startsAt: new Date("2030-01-01T10:00Z"), endsAt: new Date("2030-01-01T11:00Z"), meetingUrl: "https://meet.example.test/c", capacity: null, instructorIds: [] });
  liveSessionId = (await prisma.liveSession.findUnique({ where: { lessonId: liveId } }))!.id;
});

afterAll(async () => {
  await prisma.liveSessionRegistration.deleteMany({ where: { liveSession: { lesson: { courseId: { in: [courseId, unscheduledCourseId] } } } } });
  await prisma.lessonProgress.deleteMany({ where: { lesson: { courseId: { in: [courseId, unscheduledCourseId] } } } });
  await prisma.courseProgress.deleteMany({ where: { courseId: { in: [courseId, unscheduledCourseId] } } });
  await prisma.course.deleteMany({ where: { id: { in: [courseId, unscheduledCourseId] } } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

it("attendance recorded before the earlier lesson is done completes the session once that lesson is complete", async () => {
  await markAttendance(liveSessionId, [learner.id], admin);
  const before = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: learner.id, courseId } } });
  expect(before?.completedLessonIds ?? []).not.toContain(liveId);
  await completeLesson(learner, textId);
  const after = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: learner.id, courseId } } });
  expect(after?.completedLessonIds).toContain(liveId);
  expect(after?.completedAt).not.toBeNull();
});

it("an admin can record attendance for someone who was not registered", async () => {
  const other = await prisma.user.create({ data: { name: "O", email: `${tag}-o@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  await markAttendance(liveSessionId, [other.id], admin);
  expect(await prisma.liveSessionRegistration.count({ where: { liveSessionId, userId: other.id, attended: true } })).toBe(1);
});

it("a course with an unscheduled live session cannot be published", async () => {
  const r = await setCoursePublished(admin, unscheduledCourseId, true);
  expect(r.ok).toBe(false);
});
