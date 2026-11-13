import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { assignCourse, assignedCoursesFor, assignmentStatus, resolveAssignments, unassignCourse } from "./assignments";
import { completeLessonForUser } from "./progress";

const NOW = new Date("2026-11-13T00:00:00Z");
const d = (s: string) => new Date(s);

describe("resolving course assignments", () => {
  const users = [
    { id: "u1", department: "Sales", jobTitle: "Account Manager" },
    { id: "u2", department: "Sales", jobTitle: "Inside Sales" },
    { id: "u3", department: "Tech", jobTitle: "Account Manager" },
  ];

  it("covers a user, a department, or a job title, using the earliest due date", () => {
    const r = resolveAssignments(users, [
      { courseId: "c1", targetType: "DEPARTMENT", targetValue: "Sales", dueAt: d("2026-12-31") },
      { courseId: "c1", targetType: "USER", targetValue: "u1", dueAt: d("2026-12-01") },
      { courseId: "c2", targetType: "JOB_TITLE", targetValue: "Account Manager", dueAt: null },
    ]);
    const key = (x: { userId: string; courseId: string }) => `${x.userId}:${x.courseId}`;
    expect(Object.fromEntries(r.map((x) => [key(x), x.dueAt?.toISOString().slice(0, 10) ?? null]))).toEqual({
      "u1:c1": "2026-12-01", "u2:c1": "2026-12-31", "u1:c2": null, "u3:c2": null,
    });
  });

  it("gives each assignment a status", () => {
    expect(assignmentStatus(d("2026-12-01"), { completedAt: d("2026-11-01"), completedCount: 3 }, NOW)).toBe("Completed");
    expect(assignmentStatus(d("2026-11-01"), { completedAt: null, completedCount: 1 }, NOW)).toBe("Overdue");
    expect(assignmentStatus(d("2026-12-01"), { completedAt: null, completedCount: 1 }, NOW)).toBe("In progress");
    expect(assignmentStatus(null, null, NOW)).toBe("Not started");
  });
});

describe("assigning courses", () => {
  const tag = `assign-${Date.now()}`;
  let admin: SessionUser;
  let manager: SessionUser;
  let member: SessionUser;
  let outsider: SessionUser;
  let subjectId: string;
  let courseId: string;
  let draftId: string;
  let lessonId: string;

  const mk = async (name: string, role: "ADMIN" | "MANAGER" | "EMPLOYEE", extra: { managerId?: string; department?: string; jobTitle?: string } = {}): Promise<SessionUser> => {
    const u = await prisma.user.create({ data: { name, email: `${tag}-${name}@example.test`, passwordHash: "x", role, ...extra } });
    return { id: u.id, role, active: true, name, email: u.email, department: extra.department ?? null };
  };

  beforeAll(async () => {
    admin = await mk("admin", "ADMIN");
    manager = await mk("mgr", "MANAGER");
    member = await mk("member", "EMPLOYEE", { managerId: manager.id, department: `${tag}-dept`, jobTitle: `${tag}-title` });
    outsider = await mk("outsider", "EMPLOYEE");
    subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "BUSINESS" } })).id;
    const course = await prisma.course.create({
      data: { subjectId, title: `${tag} course`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED", lessons: { create: { position: 1, title: "L1", type: "TEXT", body: "x" } } },
      include: { lessons: true },
    });
    courseId = course.id;
    lessonId = course.lessons[0].id;
    draftId = (await prisma.course.create({ data: { subjectId, title: `${tag} draft`, level: "BASIC", passMarkPercent: 70 } })).id;
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { actorId: { in: [admin.id, manager.id] } } });
    await prisma.course.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("lets an admin assign a published course to a department with a due date, enrolling its members", async () => {
    const r = await assignCourse(admin, { courseId, targetType: "DEPARTMENT", targetValue: `${tag}-dept`, dueAt: d("2026-12-31") }, NOW);
    expect(r.ok).toBe(true);
    expect(await assignedCoursesFor(member.id, NOW)).toEqual([expect.objectContaining({ courseId, status: "Not started" })]);
    expect(await assignedCoursesFor(outsider.id, NOW)).toEqual([]);
  });

  it("refuses draft courses and past due dates", async () => {
    expect(await assignCourse(admin, { courseId: draftId, targetType: "USER", targetValue: member.id, dueAt: null }, NOW)).toMatchObject({ ok: false });
    expect(await assignCourse(admin, { courseId, targetType: "USER", targetValue: member.id, dueAt: d("2026-01-01") }, NOW)).toMatchObject({ ok: false });
  });

  it("lets a manager assign to their own team member only, never a department", async () => {
    expect((await assignCourse(manager, { courseId, targetType: "USER", targetValue: member.id, dueAt: d("2026-11-20") }, NOW)).ok).toBe(true);
    await expect(assignCourse(manager, { courseId, targetType: "USER", targetValue: outsider.id, dueAt: null }, NOW)).rejects.toThrow();
    expect(await assignCourse(manager, { courseId, targetType: "DEPARTMENT", targetValue: `${tag}-dept`, dueAt: null }, NOW)).toMatchObject({ ok: false });
    await expect(assignCourse(member, { courseId, targetType: "USER", targetValue: member.id, dueAt: null }, NOW)).rejects.toThrow();
    // The manager's earlier date wins over the department's.
    expect((await assignedCoursesFor(member.id, NOW))[0].dueAt?.toISOString().slice(0, 10)).toBe("2026-11-20");
  });

  it("shows overdue, then completed", async () => {
    expect((await assignedCoursesFor(member.id, d("2026-11-25")))[0].status).toBe("Overdue");
    await completeLessonForUser(member.id, lessonId);
    expect((await assignedCoursesFor(member.id, d("2026-11-25")))[0].status).toBe("Completed");
  });

  it("lets a manager remove their team's assignment, but not an admin's department one", async () => {
    const mine = await prisma.courseAssignment.findFirstOrThrow({ where: { courseId, targetType: "USER", targetValue: member.id } });
    const dept = await prisma.courseAssignment.findFirstOrThrow({ where: { courseId, targetType: "DEPARTMENT" } });
    await expect(unassignCourse(manager, dept.id)).rejects.toThrow();
    expect((await unassignCourse(manager, mine.id)).ok).toBe(true);
    expect(await prisma.auditEvent.count({ where: { action: { in: ["course.assign", "course.unassign"] }, actorId: { in: [admin.id, manager.id] } } })).toBe(3);
  });
});
