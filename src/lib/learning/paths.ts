import { prisma } from "../db/client";
import { AuthError, canViewUser } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import type { AssignmentTarget, TrainingGoal } from "../../generated/prisma/client";
import { recordAudit } from "../audit/record";
import { resolveAssignments } from "./assignments";
export { allAssignmentRefs } from "./assignments";

export type Result = { ok: true; id?: string } | { ok: false; error: string };

// The kinds of training an admin can build, shown as cards when creating a path.
export const GOALS: { key: TrainingGoal; label: string; text: string }[] = [
  { key: "SALES_ENABLEMENT", label: "Sales enablement", text: "Help sales and presales teams win more deals, from first call to signed order." },
  { key: "SOFT_SKILLS", label: "Soft skills", text: "Communication, negotiation and working with data, for everyone." },
  { key: "CUSTOMER_ENABLEMENT", label: "Customer solutions", text: "Know the solutions we sell well enough to advise customers with confidence." },
  { key: "PROCESS_WORKFLOW", label: "Process and workflow", text: "Step-by-step company processes, so every team works the same way." },
  { key: "COMPLIANCE", label: "Compliance", text: "Policies, laws and regulations everyone must follow, kept up to date." },
  { key: "ONBOARDING", label: "Onboarding", text: "Get new joiners productive quickly with a planned first few weeks." },
  { key: "TECHNICAL_SKILLS", label: "Technical skills", text: "Engineering tracks for networks, data centres, security and cloud." },
  { key: "LEADERSHIP", label: "Leadership and management", text: "Develop managers who hire well, grow people and lead change." },
];
const GOAL_KEYS = new Set<string>(GOALS.map((g) => g.key));
export const goalLabel = (g: TrainingGoal) => GOALS.find((x) => x.key === g)?.label ?? g;
export function parseGoals(values: string[]): TrainingGoal[] {
  return [...new Set(values.filter((v) => GOAL_KEYS.has(v)))] as TrainingGoal[];
}

// --- Pure helpers ---------------------------------------------------------------------

// Ready-made paths that match the chosen goals, best match first. With no goals, all.
export function rankTemplates<T extends { goals: TrainingGoal[]; title: string }>(templates: T[], goals: TrainingGoal[]): T[] {
  const score = (t: T) => t.goals.filter((g) => goals.includes(g)).length;
  return templates
    .filter((t) => goals.length === 0 || score(t) > 0)
    .sort((a, b) => score(b) - score(a) || a.title.localeCompare(b.title));
}

// A person's progress through a path: courses finished out of the path's published courses.
export function pathProgress(courseIds: string[], completedCourseIds: Set<string>) {
  const done = courseIds.filter((id) => completedCourseIds.has(id)).length;
  const total = courseIds.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100), completed: total > 0 && done === total };
}

// --- Assignment expansion -------------------------------------------------------------

// The paths assigned to each user (pathId -> earliest due date), for the given users.
export async function assignedPathsByUser(users: { id: string; department: string | null; jobTitle: string | null }[]) {
  const assignments = await prisma.learningPathAssignment.findMany({ where: { path: { isTemplate: false } } });
  // resolveAssignments works on "courseId"; a path id stands in for it here.
  return resolveAssignments(users, assignments.map((a) => ({ courseId: a.pathId, targetType: a.targetType, targetValue: a.targetValue, dueAt: a.dueAt })))
    .map((r) => ({ userId: r.userId, pathId: r.courseId, dueAt: r.dueAt }));
}

async function publishedCoursesOf(pathIds: string[]) {
  const rows = await prisma.learningPathCourse.findMany({
    where: { pathId: { in: pathIds }, course: { status: "PUBLISHED" } },
    orderBy: { position: "asc" },
    select: { pathId: true, courseId: true },
  });
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.pathId, [...(map.get(r.pathId) ?? []), r.courseId]);
  return map;
}

// The learning paths assigned to one learner, with their progress.
export async function learnerPaths(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, department: true, jobTitle: true } });
  if (!user) return [];
  const assigned = await assignedPathsByUser([user]);
  if (assigned.length === 0) return [];
  const [paths, courses, done] = await Promise.all([
    prisma.learningPath.findMany({ where: { id: { in: assigned.map((a) => a.pathId) } }, select: { id: true, title: true, description: true } }),
    publishedCoursesOf(assigned.map((a) => a.pathId)),
    prisma.courseProgress.findMany({ where: { userId, completedAt: { not: null } }, select: { courseId: true } }),
  ]);
  const completed = new Set(done.map((d) => d.courseId));
  const due = new Map(assigned.map((a) => [a.pathId, a.dueAt]));
  return paths
    .map((p) => ({ ...p, dueAt: due.get(p.id) ?? null, ...pathProgress(courses.get(p.id) ?? [], completed) }))
    .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) || a.title.localeCompare(b.title));
}

// Everyone a path covers, with progress, for the path's report. Managers see their team only.
export async function pathReport(viewer: SessionUser, pathId: string, now: Date = new Date()) {
  const all = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, department: true, jobTitle: true, managerId: true } });
  const visible = viewer.role === "ADMIN" ? all : all.filter((u) => u.id !== viewer.id && canViewUser(viewer, u.id, all));
  const assigned = (await assignedPathsByUser(visible)).filter((a) => a.pathId === pathId);
  const courses = (await publishedCoursesOf([pathId])).get(pathId) ?? [];
  const progress = await prisma.courseProgress.findMany({ where: { userId: { in: assigned.map((a) => a.userId) }, courseId: { in: courses }, completedAt: { not: null } }, select: { userId: true, courseId: true } });
  const byUser = new Map<string, Set<string>>();
  for (const p of progress) byUser.set(p.userId, (byUser.get(p.userId) ?? new Set()).add(p.courseId));
  const person = new Map(visible.map((u) => [u.id, u]));
  return assigned
    .map((a) => {
      const pr = pathProgress(courses, byUser.get(a.userId) ?? new Set());
      const status = pr.completed ? "Completed" : a.dueAt && a.dueAt < now ? "Overdue" : pr.done > 0 ? "In progress" : "Not started";
      return { userId: a.userId, name: person.get(a.userId)?.name ?? "", department: person.get(a.userId)?.department ?? "", dueAt: a.dueAt, status, ...pr };
    })
    .sort((x, y) => x.name.localeCompare(y.name));
}

// --- Admin operations -----------------------------------------------------------------

const asAdmin = (actor: SessionUser) => { if (actor.role !== "ADMIN") throw new AuthError(403); };

async function editablePath(id: string) {
  const path = await prisma.learningPath.findUnique({ where: { id }, include: { courses: { orderBy: { position: "asc" } } } });
  if (!path) return { error: "Learning path not found" } as const;
  if (path.isTemplate) return { error: "Ready-made paths cannot be changed. Use the path to make your own copy." } as const;
  return { path } as const;
}

export async function createPath(actor: SessionUser, input: { title: string; description?: string; goals: TrainingGoal[]; courseIds: string[] }): Promise<Result> {
  asAdmin(actor);
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Give the learning path a name" };
  const ids = [...new Set(input.courseIds)];
  if (ids.length === 0) return { ok: false, error: "Choose at least one course" };
  const found = await prisma.course.findMany({ where: { id: { in: ids }, status: { not: "ARCHIVED" } }, select: { id: true } });
  if (found.length !== ids.length) return { ok: false, error: "A chosen course is not available" };
  const path = await prisma.$transaction(async (tx) => {
    const p = await tx.learningPath.create({
      data: { title, description: input.description?.trim() || null, goals: input.goals, createdById: actor.id, courses: { create: ids.map((courseId, i) => ({ courseId, position: i + 1 })) } },
    });
    await recordAudit(tx, { actorId: actor.id, action: "path.create", entityType: "LearningPath", entityId: p.id, after: { title, goals: input.goals, courseIds: ids } });
    return p;
  });
  return { ok: true, id: path.id };
}

// "Use this path": a ready-made path becomes the admin's own, editable copy.
export async function copyTemplate(actor: SessionUser, templateId: string): Promise<Result> {
  asAdmin(actor);
  const t = await prisma.learningPath.findUnique({ where: { id: templateId }, include: { courses: { orderBy: { position: "asc" }, where: { course: { status: { not: "ARCHIVED" } } } } } });
  if (!t || !t.isTemplate) return { ok: false, error: "Ready-made path not found" };
  return createPath(actor, { title: t.title, description: t.description ?? undefined, goals: t.goals, courseIds: t.courses.map((c) => c.courseId) });
}

export async function updatePath(actor: SessionUser, id: string, input: { title: string; description?: string; goals: TrainingGoal[] }): Promise<Result> {
  asAdmin(actor);
  const found = await editablePath(id);
  if ("error" in found) return { ok: false, error: found.error as string };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Give the learning path a name" };
  await prisma.$transaction(async (tx) => {
    await tx.learningPath.update({ where: { id }, data: { title, description: input.description?.trim() || null, goals: input.goals } });
    await recordAudit(tx, { actorId: actor.id, action: "path.update", entityType: "LearningPath", entityId: id, before: { title: found.path.title, goals: found.path.goals }, after: { title, goals: input.goals } });
  });
  return { ok: true, id };
}

export async function addCourseToPath(actor: SessionUser, id: string, courseId: string): Promise<Result> {
  asAdmin(actor);
  const found = await editablePath(id);
  if ("error" in found) return { ok: false, error: found.error as string };
  if (found.path.courses.some((c) => c.courseId === courseId)) return { ok: false, error: "That course is already in the path" };
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { status: true, title: true } });
  if (!course || course.status === "ARCHIVED") return { ok: false, error: "Choose an available course" };
  const position = (found.path.courses.at(-1)?.position ?? 0) + 1;
  await prisma.$transaction(async (tx) => {
    await tx.learningPathCourse.create({ data: { pathId: id, courseId, position } });
    await recordAudit(tx, { actorId: actor.id, action: "path.course-add", entityType: "LearningPath", entityId: id, after: { courseId, course: course.title } });
  });
  return { ok: true, id };
}

export async function removeCourseFromPath(actor: SessionUser, id: string, courseId: string): Promise<Result> {
  asAdmin(actor);
  const found = await editablePath(id);
  if ("error" in found) return { ok: false, error: found.error as string };
  if (found.path.courses.length <= 1) return { ok: false, error: "A path needs at least one course" };
  await prisma.$transaction(async (tx) => {
    await tx.learningPathCourse.deleteMany({ where: { pathId: id, courseId } });
    await recordAudit(tx, { actorId: actor.id, action: "path.course-remove", entityType: "LearningPath", entityId: id, before: { courseId } });
  });
  return { ok: true, id };
}

// Moves a course one place up or down in the path's order.
export async function moveCourseInPath(actor: SessionUser, id: string, courseId: string, direction: "up" | "down"): Promise<Result> {
  asAdmin(actor);
  const found = await editablePath(id);
  if ("error" in found) return { ok: false, error: found.error as string };
  const list = found.path.courses;
  const i = list.findIndex((c) => c.courseId === courseId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true, id };
  await prisma.$transaction([
    prisma.learningPathCourse.update({ where: { id: list[i].id }, data: { position: list[j].position } }),
    prisma.learningPathCourse.update({ where: { id: list[j].id }, data: { position: list[i].position } }),
  ]);
  return { ok: true, id };
}

export async function deletePath(actor: SessionUser, id: string): Promise<Result> {
  asAdmin(actor);
  const found = await editablePath(id);
  if ("error" in found) return { ok: false, error: found.error as string };
  await prisma.$transaction(async (tx) => {
    await tx.learningPath.delete({ where: { id } });
    await recordAudit(tx, { actorId: actor.id, action: "path.delete", entityType: "LearningPath", entityId: id, before: { title: found.path.title } });
  });
  return { ok: true, id };
}

// Admins assign any path to anyone; managers assign paths to people in their reporting line.
export async function assignPath(
  actor: SessionUser,
  input: { pathId: string; targetType: AssignmentTarget; targetValue: string; dueAt: Date | null },
  now: Date = new Date(),
): Promise<Result> {
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") throw new AuthError(403);
  const value = input.targetValue.trim();
  if (!value) return { ok: false, error: "Choose who the path is for" };
  if (input.dueAt && input.dueAt.getTime() < now.getTime()) return { ok: false, error: "The due date must be in the future" };
  const path = await prisma.learningPath.findUnique({ where: { id: input.pathId }, select: { title: true, isTemplate: true } });
  if (!path) return { ok: false, error: "Learning path not found" };
  if (path.isTemplate) return { ok: false, error: "Use the ready-made path first to make your own copy, then assign the copy" };
  if (actor.role === "MANAGER") {
    if (input.targetType !== "USER") return { ok: false, error: "Managers assign paths to people in their team" };
    const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
    if (value === actor.id || !canViewUser(actor, value, all)) throw new AuthError(403);
  } else if (input.targetType === "USER" && !(await prisma.user.findUnique({ where: { id: value }, select: { id: true } }))) {
    return { ok: false, error: "User not found" };
  }
  const row = await prisma.$transaction(async (tx) => {
    const saved = await tx.learningPathAssignment.upsert({
      where: { pathId_targetType_targetValue: { pathId: input.pathId, targetType: input.targetType, targetValue: value } },
      update: { dueAt: input.dueAt, assignedById: actor.id },
      create: { pathId: input.pathId, targetType: input.targetType, targetValue: value, dueAt: input.dueAt, assignedById: actor.id },
    });
    await recordAudit(tx, { actorId: actor.id, action: "path.assign", entityType: "LearningPathAssignment", entityId: saved.id, after: { pathId: input.pathId, path: path.title, targetType: input.targetType, targetValue: value, dueAt: input.dueAt?.toISOString() ?? null } });
    return saved;
  });
  return { ok: true, id: row.id };
}

export async function unassignPath(actor: SessionUser, assignmentId: string): Promise<Result> {
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") throw new AuthError(403);
  const a = await prisma.learningPathAssignment.findUnique({ where: { id: assignmentId } });
  if (!a) return { ok: false, error: "Assignment not found" };
  if (actor.role === "MANAGER") {
    const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
    if (a.targetType !== "USER" || a.targetValue === actor.id || !canViewUser(actor, a.targetValue, all)) throw new AuthError(403);
  }
  await prisma.$transaction(async (tx) => {
    await tx.learningPathAssignment.delete({ where: { id: assignmentId } });
    await recordAudit(tx, { actorId: actor.id, action: "path.unassign", entityType: "LearningPathAssignment", entityId: assignmentId, before: { pathId: a.pathId, targetType: a.targetType, targetValue: a.targetValue } });
  });
  return { ok: true, id: assignmentId };
}
