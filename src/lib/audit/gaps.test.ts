import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { updateUser, createSubject, updateSubject, importUsers } from "../admin/users";
import { updateCourse, createCourse } from "../learning/courses";
import { scheduleSession, markAttendance, registerForSession } from "../learning/live-sessions";

const tag = `audit-gap-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
let target: string;
let subjectId: string;
let courseId: string;
let lessonId: string;

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
  target = (await prisma.user.create({ data: { name: "T", email: `${tag}-t@example.test`, passwordHash: "x", role: "EMPLOYEE" } })).id;
});

afterAll(async () => {
  await prisma.liveSessionRegistration.deleteMany({ where: { liveSession: { lesson: { courseId } } } });
  await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
  await prisma.course.deleteMany({ where: { subject: { slug: { startsWith: tag } } } });
  await prisma.subject.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

const actions = async () => (await prisma.auditEvent.findMany({ where: { actorId: admin.id } })).map((r) => r.action);

it("every admin change writes an audit row", async () => {
  await updateUser(admin, target, { name: "T renamed" });
  expect(await actions()).toContain("user.update");

  const s = await createSubject(admin, { name: `${tag} s`, category: "TECHNICAL", certificationValidityMonths: 12 });
  expect(await actions()).toContain("subject.create");
  subjectId = (await prisma.subject.findUnique({ where: { name: `${tag} s` } }))!.id;

  await updateSubject(admin, subjectId, { name: `${tag} s2` });
  expect(await actions()).toContain("subject.update");
  void s;

  const c = await createCourse(admin, { subjectId, title: `${tag} c`, description: "", level: "BASIC", passMarkPercent: 70 });
  courseId = c.ok ? c.id! : "";
  await updateCourse(admin, courseId, { title: `${tag} c2` });
  expect(await actions()).toContain("course.update");

  const lesson = await prisma.lesson.create({ data: { courseId, position: 1, title: "Live", type: "LIVE_SESSION" } });
  lessonId = lesson.id;
  const sched = await scheduleSession(admin, lessonId, { startsAt: new Date("2026-12-01T10:00Z"), endsAt: new Date("2026-12-01T11:00Z"), meetingUrl: "https://meet.example.test/x", capacity: null, instructorIds: [] });
  expect(sched.ok).toBe(true);
  expect(await actions()).toContain("session.schedule");

  const sessionId = (await prisma.liveSession.findUnique({ where: { lessonId } }))!.id;
  await registerForSession(sessionId, target, new Date("2026-11-01T00:00Z"));
  await markAttendance(sessionId, [target], admin);
  expect(await actions()).toContain("session.attendance");

  const csv = `name,email,role,department,managerEmail,password\nNew Person,${tag}-new@example.test,EMPLOYEE,Ops,,Start-pass-1`;
  expect((await importUsers(admin, csv)).ok).toBe(true);
  expect(await actions()).toContain("user.import");
});
