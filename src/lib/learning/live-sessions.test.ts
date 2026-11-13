import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { scheduleSession, registerForSession, markAttendance } from "./live-sessions";

const tag = `live-${Date.now()}`;
let admin: SessionUser;
let manager: SessionUser;
let member: string;
let outsider: string;
let courseId: string;
let lessonId: string;
let sessionId: string;
let fullSessionId: string;
let endedSessionId: string;
const START = new Date("2026-12-01T10:00:00Z");
const END = new Date("2026-12-01T11:00:00Z");
const asUser = (id: string, role: SessionUser["role"]): SessionUser => ({ id, role, active: true, name: id, email: "", department: null });

beforeAll(async () => {
  const a = await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } });
  admin = asUser(a.id, "ADMIN");
  const m = await prisma.user.create({ data: { name: "M", email: `${tag}-m@example.test`, passwordHash: "x", role: "MANAGER" } });
  manager = asUser(m.id, "MANAGER");
  member = (await prisma.user.create({ data: { name: "Mem", email: `${tag}-mem@example.test`, passwordHash: "x", role: "EMPLOYEE", managerId: m.id } })).id;
  outsider = (await prisma.user.create({ data: { name: "Out", email: `${tag}-out@example.test`, passwordHash: "x", role: "EMPLOYEE" } })).id;
  const subject = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } });
  const course = await prisma.course.create({ data: { subjectId: subject.id, title: `${tag} course`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } });
  courseId = course.id;
  const lesson = await prisma.lesson.create({ data: { courseId, position: 1, title: "Live", type: "LIVE_SESSION" } });
  lessonId = lesson.id;
  const session = await prisma.liveSession.create({ data: { lessonId, startsAt: START, endsAt: END, meetingUrl: "https://meet.example.test/a", capacity: 2 } });
  sessionId = session.id;
  const l2 = await prisma.lesson.create({ data: { courseId, position: 2, title: "Live 2", type: "LIVE_SESSION" } });
  fullSessionId = (await prisma.liveSession.create({ data: { lessonId: l2.id, startsAt: START, endsAt: END, meetingUrl: "https://meet.example.test/b", capacity: 0 } })).id;
  const l3 = await prisma.lesson.create({ data: { courseId, position: 3, title: "Live 3", type: "LIVE_SESSION" } });
  endedSessionId = (await prisma.liveSession.create({ data: { lessonId: l3.id, startsAt: new Date("2026-01-01T10:00:00Z"), endsAt: new Date("2026-01-01T11:00:00Z"), meetingUrl: "https://meet.example.test/c" } })).id;
});

afterAll(async () => {
  await prisma.liveSessionRegistration.deleteMany({ where: { liveSession: { lesson: { courseId } } } });
  await prisma.lessonProgress.deleteMany({ where: { lesson: { courseId } } });
  await prisma.courseProgress.deleteMany({ where: { courseId } });
  await prisma.course.deleteMany({ where: { id: courseId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.subject.deleteMany({ where: { slug: `${tag}-s` } });
  await prisma.$disconnect();
});

describe("live sessions", () => {
  it("refuses a session that ends before it starts", async () => {
    const r = await scheduleSession(admin, lessonId, { startsAt: END, endsAt: START, meetingUrl: "https://x.example.test", capacity: null, instructorIds: [] });
    expect(r.ok).toBe(false);
  });

  it("registration stops at capacity (exactly full refuses the next)", async () => {
    const extra = await prisma.user.create({ data: { name: "X", email: `${tag}-x@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
    expect((await registerForSession(sessionId, member, START)).ok).toBe(true);
    expect((await registerForSession(sessionId, outsider, START)).ok).toBe(true);
    const third = await registerForSession(sessionId, extra.id, START);
    expect(third).toEqual({ ok: false, error: "This session is full" });
  });

  it("refuses a second registration by the same person", async () => {
    expect((await registerForSession(sessionId, member, START)).ok).toBe(false);
  });

  it("refuses registration once the session has ended", async () => {
    expect((await registerForSession(endedSessionId, member, new Date("2026-06-01T00:00:00Z"))).ok).toBe(false);
  });

  it("capacity 0 means no places at all", async () => {
    expect((await registerForSession(fullSessionId, member, START)).ok).toBe(false);
  });

  it("a manager cannot mark attendance for someone outside their team (403)", async () => {
    await expect(markAttendance(sessionId, [outsider], manager)).rejects.toMatchObject({ status: 403 });
  });

  it("marking a team member as attended completes the lesson for them", async () => {
    await markAttendance(sessionId, [member], manager);
    const reg = await prisma.liveSessionRegistration.findFirst({ where: { liveSessionId: sessionId, userId: member } });
    expect(reg?.attended).toBe(true);
    const cp = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: member, courseId } } });
    expect(cp?.completedLessonIds).toContain(lessonId);
  });
});
