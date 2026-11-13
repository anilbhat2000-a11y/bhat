import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import { registerForSession } from "./live-sessions";

const tag = `race-${Date.now()}`;
let sessionId: string;
let lessonId: string;
let courseId: string;
let subjectId: string;
const users: string[] = [];

beforeAll(async () => {
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  courseId = (await prisma.course.create({ data: { subjectId, title: `${tag} c`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } })).id;
  lessonId = (await prisma.lesson.create({ data: { courseId, position: 1, title: "Live", type: "LIVE_SESSION" } })).id;
  sessionId = (await prisma.liveSession.create({
    data: { lessonId, startsAt: new Date("2030-01-01T10:00Z"), endsAt: new Date("2030-01-01T11:00Z"), meetingUrl: "https://meet.example.test/r", capacity: 1 },
  })).id;
  for (let i = 0; i < 3; i++) {
    users.push((await prisma.user.create({ data: { name: `U${i}`, email: `${tag}-${i}@example.test`, passwordHash: "x", role: "EMPLOYEE" } })).id);
  }
});

afterAll(async () => {
  await prisma.liveSessionRegistration.deleteMany({ where: { liveSessionId: sessionId } });
  await prisma.liveSession.deleteMany({ where: { id: sessionId } });
  await prisma.lesson.deleteMany({ where: { courseId } });
  await prisma.course.deleteMany({ where: { id: courseId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

it("three registrations at once for one place: exactly one succeeds (review: capacity race)", async () => {
  const results = await Promise.all(users.map((u) => registerForSession(sessionId, u, new Date("2029-06-01T00:00Z"))));
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect(await prisma.liveSessionRegistration.count({ where: { liveSessionId: sessionId } })).toBe(1);
});
