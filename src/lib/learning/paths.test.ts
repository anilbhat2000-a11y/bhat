import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import {
  addCourseToPath, assignPath, copyTemplate, createPath, deletePath, learnerPaths, moveCourseInPath, parseGoals,
  pathProgress, pathReport, rankTemplates, removeCourseFromPath, unassignPath,
} from "./paths";
import { assignedCoursesFor } from "./assignments";
import { completeLessonForUser } from "./progress";
import { bucketWork, lmsDashboard } from "../reports/lms-dashboard";

const NOW = new Date("2026-11-13T00:00:00Z");

describe("learning path helpers", () => {
  it("ranks ready-made paths by how many chosen training types they match", () => {
    const t = [
      { title: "B", goals: ["SALES_ENABLEMENT"] as const },
      { title: "A", goals: ["SALES_ENABLEMENT", "SOFT_SKILLS"] as const },
      { title: "C", goals: ["TECHNICAL_SKILLS"] as const },
    ].map((x) => ({ ...x, goals: [...x.goals] }));
    expect(rankTemplates(t, ["SALES_ENABLEMENT", "SOFT_SKILLS"]).map((x) => x.title)).toEqual(["A", "B"]);
    expect(rankTemplates(t, []).map((x) => x.title)).toEqual(["A", "B", "C"]);
  });

  it("parses goals, ignoring unknown values and duplicates", () => {
    expect(parseGoals(["COMPLIANCE", "COMPLIANCE", "HACKING"])).toEqual(["COMPLIANCE"]);
  });

  it("counts a path complete only when every course is done", () => {
    expect(pathProgress(["a", "b"], new Set(["a"]))).toEqual({ done: 1, total: 2, percent: 50, completed: false });
    expect(pathProgress(["a", "b"], new Set(["a", "b"])).completed).toBe(true);
    expect(pathProgress([], new Set()).completed).toBe(false);
  });

  it("buckets assigned work into due soon, overdue and completed", () => {
    const item = (id: string, due: string | null, done: string | null) => ({ userId: id, name: id, courseId: id, course: id, dueAt: due ? new Date(due) : null, completedAt: done ? new Date(done) : null });
    const b = bucketWork([
      item("soon", "2026-11-20", null), item("later", "2027-02-01", null), item("late", "2026-11-01", null),
      item("done", "2026-11-01", "2026-11-10"), item("old", null, "2025-01-01"),
    ], NOW, new Date("2026-10-14"));
    expect(b.dueSoon.map((x) => x.userId)).toEqual(["soon"]);
    expect(b.overdue.map((x) => x.userId)).toEqual(["late"]);
    expect(b.completed.map((x) => x.userId)).toEqual(["done"]);
  });
});

describe("learning paths", () => {
  const tag = `path-${Date.now()}`;
  let admin: SessionUser;
  let manager: SessionUser;
  let member: SessionUser;
  let outsider: SessionUser;
  let subjectId: string;
  const courseIds: string[] = [];
  const lessonIds: string[] = [];
  let templateId: string;

  const mk = async (name: string, role: "ADMIN" | "MANAGER" | "EMPLOYEE", extra: { managerId?: string; department?: string } = {}): Promise<SessionUser> => {
    const u = await prisma.user.create({ data: { name, email: `${tag}-${name}@example.test`, passwordHash: "x", role, ...extra } });
    return { id: u.id, role, active: true, name, email: u.email, department: extra.department ?? null };
  };

  beforeAll(async () => {
    admin = await mk("admin", "ADMIN");
    manager = await mk("mgr", "MANAGER");
    member = await mk("member", "EMPLOYEE", { managerId: manager.id, department: `${tag}-dept` });
    outsider = await mk("outsider", "EMPLOYEE");
    subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "BUSINESS" } })).id;
    for (const n of [1, 2, 3]) {
      const c = await prisma.course.create({
        data: { subjectId, title: `${tag} course ${n}`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED", lessons: { create: { position: 1, title: "L1", type: "TEXT", body: "x" } } },
        include: { lessons: true },
      });
      courseIds.push(c.id);
      lessonIds.push(c.lessons[0].id);
    }
    templateId = (await prisma.learningPath.create({
      data: { title: `${tag} template`, goals: ["ONBOARDING"], isTemplate: true, templateKey: tag, courses: { create: courseIds.slice(0, 2).map((courseId, i) => ({ courseId, position: i + 1 })) } },
    })).id;
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { actorId: { in: [admin.id, manager.id] } } });
    await prisma.learningPath.deleteMany({ where: { OR: [{ templateKey: tag }, { createdById: admin.id }] } });
    await prisma.course.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("copies a ready-made path, which cannot itself be changed or assigned", async () => {
    const copy = await copyTemplate(admin, templateId);
    expect(copy.ok).toBe(true);
    const p = await prisma.learningPath.findUniqueOrThrow({ where: { id: copy.ok ? copy.id! : "" }, include: { courses: { orderBy: { position: "asc" } } } });
    expect(p.isTemplate).toBe(false);
    expect(p.courses.map((c) => c.courseId)).toEqual(courseIds.slice(0, 2));
    expect(await addCourseToPath(admin, templateId, courseIds[2])).toMatchObject({ ok: false });
    expect(await assignPath(admin, { pathId: templateId, targetType: "USER", targetValue: member.id, dueAt: null }, NOW)).toMatchObject({ ok: false });
    await expect(copyTemplate(member, templateId)).rejects.toThrow();
  });

  it("builds a custom path, edits its courses and order, and needs at least one course", async () => {
    expect(await createPath(admin, { title: "x", goals: [], courseIds: [] })).toMatchObject({ ok: false });
    const r = await createPath(admin, { title: `${tag} custom`, goals: ["TECHNICAL_SKILLS"], courseIds: [courseIds[0]] });
    const id = r.ok ? r.id! : "";
    expect((await addCourseToPath(admin, id, courseIds[1])).ok).toBe(true);
    expect(await addCourseToPath(admin, id, courseIds[1])).toMatchObject({ ok: false });
    expect((await moveCourseInPath(admin, id, courseIds[1], "up")).ok).toBe(true);
    const order = (await prisma.learningPathCourse.findMany({ where: { pathId: id }, orderBy: { position: "asc" } })).map((c) => c.courseId);
    expect(order).toEqual([courseIds[1], courseIds[0]]);
    expect((await removeCourseFromPath(admin, id, courseIds[1])).ok).toBe(true);
    expect(await removeCourseFromPath(admin, id, courseIds[0])).toMatchObject({ ok: false });
    expect((await deletePath(admin, id)).ok).toBe(true);
  });

  it("assigns a path to a department: learners get its courses, progress and the dashboard counts", async () => {
    const r = await createPath(admin, { title: `${tag} onboarding`, goals: ["ONBOARDING"], courseIds: courseIds.slice(0, 2) });
    const id = r.ok ? r.id! : "";
    expect((await assignPath(admin, { pathId: id, targetType: "DEPARTMENT", targetValue: `${tag}-dept`, dueAt: new Date("2026-11-20T00:00:00Z") }, NOW)).ok).toBe(true);
    expect((await assignedCoursesFor(member.id, NOW)).map((a) => a.courseId).sort()).toEqual(courseIds.slice(0, 2).sort());
    expect(await learnerPaths(outsider.id)).toEqual([]);
    await completeLessonForUser(member.id, lessonIds[0]);
    expect(await learnerPaths(member.id)).toEqual([expect.objectContaining({ id, done: 1, total: 2, completed: false })]);
    await completeLessonForUser(member.id, lessonIds[1]);
    expect((await pathReport(admin, id, NOW))).toEqual([expect.objectContaining({ userId: member.id, status: "Completed" })]);
    // The manager sees their team member on the path; the dashboard counts the completion.
    expect((await pathReport(manager, id, NOW)).map((x) => x.userId)).toEqual([member.id]);
    const dash = await lmsDashboard(manager, "month", new Date());
    expect(dash.members.total).toBe(1);
    expect(dash.paths.completed).toBe(1);
    expect(dash.work.completed.length).toBe(2);
  });

  it("lets a manager assign and remove paths for their own team only", async () => {
    const r = await createPath(admin, { title: `${tag} team`, goals: [], courseIds: [courseIds[2]] });
    const id = r.ok ? r.id! : "";
    const a = await assignPath(manager, { pathId: id, targetType: "USER", targetValue: member.id, dueAt: null }, NOW);
    expect(a.ok).toBe(true);
    await expect(assignPath(manager, { pathId: id, targetType: "USER", targetValue: outsider.id, dueAt: null }, NOW)).rejects.toThrow();
    expect(await assignPath(manager, { pathId: id, targetType: "DEPARTMENT", targetValue: `${tag}-dept`, dueAt: null }, NOW)).toMatchObject({ ok: false });
    expect((await unassignPath(manager, a.ok ? a.id! : "")).ok).toBe(true);
  });
});
