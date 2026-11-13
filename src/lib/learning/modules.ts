import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import type { CourseStatus } from "../../generated/prisma/client";
import { recordAudit, writeWithAudit } from "../audit/record";
import type { Result } from "./courses";

const asAdmin = (actor: SessionUser) => requireRole(actor, ["ADMIN"]);

// --- Pure helpers ---------------------------------------------------------------------

export type ModuleRef = { id: string; title: string; position: number; estimatedMinutes: number | null };

// Splits lessons (already in position order) into runs that share a module, for display.
// A run with module null holds lessons that belong to no module.
export function groupByModule<L extends { moduleId: string | null }>(
  lessons: L[],
  modules: ModuleRef[],
): { module: ModuleRef | null; lessons: L[] }[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const groups: { module: ModuleRef | null; lessons: L[] }[] = [];
  for (const lesson of lessons) {
    const module = lesson.moduleId ? byId.get(lesson.moduleId) ?? null : null;
    const last = groups[groups.length - 1];
    if (last && (last.module?.id ?? null) === (module?.id ?? null)) last.lessons.push(lesson);
    else groups.push({ module, lessons: [lesson] });
  }
  return groups;
}

// The lesson order once lessons are grouped: modules in module order, lessons within a
// module in their current order, and lessons without a module last.
export function orderByModule(
  lessons: { id: string; position: number; moduleId: string | null }[],
  modules: { id: string; position: number }[],
): string[] {
  const rank = new Map(modules.map((m) => [m.id, m.position]));
  return [...lessons]
    .sort((a, b) => {
      const ra = a.moduleId ? rank.get(a.moduleId) ?? Infinity : Infinity;
      const rb = b.moduleId ? rank.get(b.moduleId) ?? Infinity : Infinity;
      return ra - rb || a.position - b.position;
    })
    .map((l) => l.id);
}

// Learners open published courses. An archived course stays open, read-only, to learners
// who had already started it, so their history is not lost when a course is retired.
export function learnerCanOpen(status: CourseStatus, hasProgress: boolean): boolean {
  return status === "PUBLISHED" || (status === "ARCHIVED" && hasProgress);
}

export function totalMinutes(modules: { estimatedMinutes: number | null }[]): number {
  return modules.reduce((sum, m) => sum + (m.estimatedMinutes ?? 0), 0);
}

// --- Admin operations -----------------------------------------------------------------

export async function addModule(
  actor: SessionUser,
  courseId: string,
  input: { title: string; estimatedMinutes?: number | null },
): Promise<Result> {
  asAdmin(actor);
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Module title is required" };
  const minutes = input.estimatedMinutes ?? null;
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 10000)) {
    return { ok: false, error: "Estimated minutes must be a whole number from 1 to 10000" };
  }
  if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) {
    return { ok: false, error: "Course not found" };
  }
  const last = await prisma.module.findFirst({ where: { courseId }, orderBy: { position: "desc" } });
  const created = await writeWithAudit(
    (tx) => tx.module.create({ data: { courseId, title, estimatedMinutes: minutes, position: (last?.position ?? 0) + 1 } }),
    (m) => ({ actorId: actor.id, action: "module.add", entityType: "Module", entityId: m.id, after: { courseId, title, estimatedMinutes: minutes } }),
  );
  return { ok: true, id: created.id };
}

// The module's lessons stay in the course, without a module.
export async function deleteModule(actor: SessionUser, moduleId: string): Promise<Result> {
  asAdmin(actor);
  const module = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!module) return { ok: false, error: "Module not found" };
  await prisma.$transaction(async (tx) => {
    await tx.module.delete({ where: { id: moduleId } });
    await recordAudit(tx, { actorId: actor.id, action: "module.delete", entityType: "Module", entityId: moduleId, before: { courseId: module.courseId, title: module.title } });
  });
  return { ok: true, id: moduleId };
}

// Sets each lesson's module (empty string or null means no module), then re-sorts lesson
// positions so each module's lessons are together, in module order.
export async function assignLessonModules(
  actor: SessionUser,
  courseId: string,
  assignment: Record<string, string | null>,
): Promise<Result> {
  asAdmin(actor);
  const [lessons, modules] = await Promise.all([
    prisma.lesson.findMany({ where: { courseId }, select: { id: true, position: true, moduleId: true } }),
    prisma.module.findMany({ where: { courseId }, select: { id: true, position: true } }),
  ]);
  const lessonIds = new Set(lessons.map((l) => l.id));
  const moduleIds = new Set(modules.map((m) => m.id));
  for (const [lessonId, moduleId] of Object.entries(assignment)) {
    if (!lessonIds.has(lessonId)) return { ok: false, error: "A lesson does not belong to this course" };
    if (moduleId && !moduleIds.has(moduleId)) return { ok: false, error: "A module does not belong to this course" };
  }
  const next = lessons.map((l) => (l.id in assignment ? { ...l, moduleId: assignment[l.id] || null } : l));
  const order = orderByModule(next, modules);

  await prisma.$transaction(async (tx) => {
    for (const l of next) await tx.lesson.update({ where: { id: l.id }, data: { moduleId: l.moduleId } });
    // (courseId, position) is unique, so park positions before writing the final ones.
    for (const [i, id] of order.entries()) await tx.lesson.update({ where: { id }, data: { position: -(i + 1) } });
    for (const [i, id] of order.entries()) await tx.lesson.update({ where: { id }, data: { position: i + 1 } });
    await recordAudit(tx, { actorId: actor.id, action: "lesson.assign-modules", entityType: "Course", entityId: courseId, after: { assignment, order } });
  });
  return { ok: true, id: courseId };
}

// Archiving retires a course: it leaves the catalogue, keeps every learner record, and can
// be restored to draft for editing and republishing.
export async function setCourseArchived(actor: SessionUser, courseId: string, archived: boolean): Promise<Result> {
  asAdmin(actor);
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { status: true } });
  if (!course) return { ok: false, error: "Course not found" };
  if (!archived && course.status !== "ARCHIVED") return { ok: false, error: "This course is not archived" };
  const status: CourseStatus = archived ? "ARCHIVED" : "DRAFT";
  await writeWithAudit(
    (tx) => tx.course.update({ where: { id: courseId }, data: { status } }),
    () => ({ actorId: actor.id, action: archived ? "course.archive" : "course.restore", entityType: "Course", entityId: courseId, before: { status: course.status }, after: { status } }),
  );
  return { ok: true, id: courseId };
}
