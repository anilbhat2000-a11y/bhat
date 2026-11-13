import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { createCourse, addLesson, setCoursePublished } from "./courses";
import {
  addModule, assignLessonModules, deleteModule, groupByModule, learnerCanOpen, orderByModule, setCourseArchived, totalMinutes,
} from "./modules";
import { listCatalogue } from "./progress";

describe("module helpers", () => {
  const m1 = { id: "m1", title: "One", position: 1, estimatedMinutes: 30 };
  const m2 = { id: "m2", title: "Two", position: 2, estimatedMinutes: null };

  it("groups consecutive lessons by module, keeping lessons without a module as their own run", () => {
    const lessons = [
      { id: "a", moduleId: "m1" }, { id: "b", moduleId: "m1" }, { id: "c", moduleId: "m2" }, { id: "d", moduleId: null },
    ];
    const groups = groupByModule(lessons, [m1, m2]);
    expect(groups.map((g) => [g.module?.id ?? null, g.lessons.map((l) => l.id)])).toEqual([
      ["m1", ["a", "b"]], ["m2", ["c"]], [null, ["d"]],
    ]);
  });

  it("orders lessons by module position, then by current position, with ungrouped lessons last", () => {
    const lessons = [
      { id: "x", position: 1, moduleId: null }, { id: "y", position: 2, moduleId: "m2" },
      { id: "z", position: 3, moduleId: "m1" }, { id: "w", position: 4, moduleId: "m2" },
    ];
    expect(orderByModule(lessons, [m1, m2])).toEqual(["z", "y", "w", "x"]);
  });

  it("lets learners open published courses, and archived ones only if they had started", () => {
    expect(learnerCanOpen("PUBLISHED", false)).toBe(true);
    expect(learnerCanOpen("ARCHIVED", true)).toBe(true);
    expect(learnerCanOpen("ARCHIVED", false)).toBe(false);
    expect(learnerCanOpen("DRAFT", true)).toBe(false);
  });

  it("adds up estimated minutes, treating blanks as zero", () => {
    expect(totalMinutes([m1, m2])).toBe(30);
  });
});

describe("modules and archiving in the database", () => {
  const tag = `modules-${Date.now()}`;
  const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
  const employee: SessionUser = { id: "", role: "EMPLOYEE", active: true, name: "E", email: "", department: null };
  let subjectId: string;
  let courseId: string;
  const lessonIds: string[] = [];

  beforeAll(async () => {
    admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
    employee.id = (await prisma.user.create({ data: { name: "E", email: `${tag}-e@example.test`, passwordHash: "x", role: "EMPLOYEE" } })).id;
    subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "BUSINESS" } })).id;
    const c = await createCourse(admin, { subjectId, title: "Three-module course", description: "", level: "BASIC", passMarkPercent: 70 });
    courseId = c.ok && c.id ? c.id : "";
    for (const t of ["L1", "L2", "L3", "L4"]) {
      const l = await addLesson(admin, courseId, { title: t, type: "TEXT", body: "text" });
      if (l.ok && l.id) lessonIds.push(l.id);
    }
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
    await prisma.course.deleteMany({ where: { subjectId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("refuses modules from non-admins and modules without a title", async () => {
    await expect(addModule(employee, courseId, { title: "X" })).rejects.toThrow();
    expect(await addModule(admin, courseId, { title: "  " })).toEqual({ ok: false, error: "Module title is required" });
    expect((await addModule(admin, courseId, { title: "X", estimatedMinutes: 0 })).ok).toBe(false);
  });

  it("creates three modules in order and groups lessons under them, re-sorting positions", async () => {
    const ids: string[] = [];
    for (const [title, minutes] of [["Intro", 20], ["Core", 40], ["Wrap-up", 15]] as const) {
      const r = await addModule(admin, courseId, { title, estimatedMinutes: minutes });
      expect(r.ok).toBe(true);
      if (r.ok && r.id) ids.push(r.id);
    }
    // L4 into Intro, L1 and L2 into Core, L3 into Wrap-up.
    const r = await assignLessonModules(admin, courseId, {
      [lessonIds[3]]: ids[0], [lessonIds[0]]: ids[1], [lessonIds[1]]: ids[1], [lessonIds[2]]: ids[2],
    });
    expect(r.ok).toBe(true);
    const lessons = await prisma.lesson.findMany({ where: { courseId }, orderBy: { position: "asc" } });
    expect(lessons.map((l) => l.title)).toEqual(["L4", "L1", "L2", "L3"]);
    expect(lessons.map((l) => l.position)).toEqual([1, 2, 3, 4]);
    const audit = await prisma.auditEvent.findMany({ where: { actorId: admin.id, action: { in: ["module.add", "lesson.assign-modules"] } } });
    expect(audit.length).toBe(4);
  });

  it("rejects an assignment that names a lesson or module from another course", async () => {
    expect((await assignLessonModules(admin, courseId, { "not-a-lesson": null })).ok).toBe(false);
    expect((await assignLessonModules(admin, courseId, { [lessonIds[0]]: "not-a-module" })).ok).toBe(false);
  });

  it("keeps a deleted module's lessons in the course, without a module", async () => {
    const intro = await prisma.module.findFirst({ where: { courseId, title: "Intro" } });
    expect((await deleteModule(admin, intro!.id)).ok).toBe(true);
    const l4 = await prisma.lesson.findUnique({ where: { id: lessonIds[3] } });
    expect(l4?.moduleId).toBeNull();
  });

  it("archives a published course out of the catalogue, and restores it to draft", async () => {
    expect((await setCoursePublished(admin, courseId, true)).ok).toBe(true);
    const inCatalogue = async () => (await listCatalogue(employee)).some((g) => g.courses.some((c) => c.id === courseId));
    expect(await inCatalogue()).toBe(true);
    expect((await setCourseArchived(admin, courseId, true)).ok).toBe(true);
    expect(await inCatalogue()).toBe(false);
    expect((await setCourseArchived(admin, courseId, false)).ok).toBe(true);
    expect((await prisma.course.findUnique({ where: { id: courseId } }))?.status).toBe("DRAFT");
    expect((await setCourseArchived(admin, courseId, false)).ok).toBe(false);
  });
});
