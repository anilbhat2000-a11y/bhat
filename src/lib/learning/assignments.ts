import { prisma } from "../db/client";
import { AuthError, canViewUser } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import type { AssignmentTarget } from "../../generated/prisma/client";
import { recordAudit } from "../audit/record";

export type Result = { ok: true; id?: string } | { ok: false; error: string };
export type AssignmentRef = { courseId: string; targetType: AssignmentTarget; targetValue: string; dueAt: Date | null };
export type Assigned = { userId: string; courseId: string; dueAt: Date | null };
export type AssignmentStatus = "Completed" | "Overdue" | "In progress" | "Not started";

// Who each assignment covers: a user by id, everyone in a department, or everyone with a
// job title. Read at the time of asking, so newcomers are enrolled automatically. When a
// person is covered more than once for a course, the earliest due date applies.
export function resolveAssignments(
  users: { id: string; department: string | null; jobTitle: string | null }[],
  assignments: AssignmentRef[],
): Assigned[] {
  const out = new Map<string, Assigned>();
  for (const a of assignments) {
    const covered = users.filter((u) =>
      a.targetType === "USER" ? u.id === a.targetValue
        : a.targetType === "DEPARTMENT" ? !!u.department && u.department === a.targetValue
          : !!u.jobTitle && u.jobTitle === a.targetValue);
    for (const u of covered) {
      const key = `${u.id}|${a.courseId}`;
      const prev = out.get(key);
      const earliest = !prev ? a.dueAt
        : prev.dueAt === null ? a.dueAt
          : a.dueAt === null ? prev.dueAt
            : (a.dueAt < prev.dueAt ? a.dueAt : prev.dueAt);
      out.set(key, { userId: u.id, courseId: a.courseId, dueAt: earliest });
    }
  }
  return [...out.values()];
}

export function assignmentStatus(dueAt: Date | null, progress: { completedAt: Date | null; completedCount: number } | null, now: Date): AssignmentStatus {
  if (progress?.completedAt) return "Completed";
  if (dueAt && dueAt.getTime() < now.getTime()) return "Overdue";
  return progress && progress.completedCount > 0 ? "In progress" : "Not started";
}

// Admins assign any published course to anyone. Managers assign published courses (the
// admin-defined catalogue) to people in their reporting line only.
export async function assignCourse(
  actor: SessionUser,
  input: { courseId: string; targetType: AssignmentTarget; targetValue: string; dueAt: Date | null },
  now: Date = new Date(),
): Promise<Result> {
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") throw new AuthError(403);
  const value = input.targetValue.trim();
  if (!value) return { ok: false, error: "Choose who the course is for" };
  if (input.dueAt && input.dueAt.getTime() < now.getTime()) return { ok: false, error: "The due date must be in the future" };
  const course = await prisma.course.findUnique({ where: { id: input.courseId }, select: { status: true, title: true } });
  if (!course || course.status !== "PUBLISHED") return { ok: false, error: "Choose a published course" };
  if (actor.role === "MANAGER") {
    if (input.targetType !== "USER") return { ok: false, error: "Managers assign courses to people in their team" };
    const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
    if (value === actor.id || !canViewUser(actor, value, all)) throw new AuthError(403);
  } else if (input.targetType === "USER" && !(await prisma.user.findUnique({ where: { id: value }, select: { id: true } }))) {
    return { ok: false, error: "User not found" };
  }
  const row = await prisma.$transaction(async (tx) => {
    const saved = await tx.courseAssignment.upsert({
      where: { courseId_targetType_targetValue: { courseId: input.courseId, targetType: input.targetType, targetValue: value } },
      update: { dueAt: input.dueAt, assignedById: actor.id },
      create: { courseId: input.courseId, targetType: input.targetType, targetValue: value, dueAt: input.dueAt, assignedById: actor.id },
    });
    await recordAudit(tx, {
      actorId: actor.id, action: "course.assign", entityType: "CourseAssignment", entityId: saved.id,
      after: { courseId: input.courseId, course: course.title, targetType: input.targetType, targetValue: value, dueAt: input.dueAt?.toISOString() ?? null },
    });
    return saved;
  });
  return { ok: true, id: row.id };
}

export async function unassignCourse(actor: SessionUser, assignmentId: string): Promise<Result> {
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") throw new AuthError(403);
  const a = await prisma.courseAssignment.findUnique({ where: { id: assignmentId } });
  if (!a) return { ok: false, error: "Assignment not found" };
  if (actor.role === "MANAGER") {
    const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
    if (a.targetType !== "USER" || a.targetValue === actor.id || !canViewUser(actor, a.targetValue, all)) throw new AuthError(403);
  }
  await prisma.$transaction(async (tx) => {
    await tx.courseAssignment.delete({ where: { id: assignmentId } });
    await recordAudit(tx, { actorId: actor.id, action: "course.unassign", entityType: "CourseAssignment", entityId: assignmentId, before: { courseId: a.courseId, targetType: a.targetType, targetValue: a.targetValue } });
  });
  return { ok: true, id: assignmentId };
}

// The published courses assigned to one person, with due dates and status, soonest first.
export async function assignedCoursesFor(userId: string, now: Date = new Date()) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, department: true, jobTitle: true } });
  if (!user) return [];
  const assignments = await prisma.courseAssignment.findMany({
    where: { course: { status: "PUBLISHED" }, OR: [
      { targetType: "USER", targetValue: user.id },
      ...(user.department ? [{ targetType: "DEPARTMENT" as const, targetValue: user.department }] : []),
      ...(user.jobTitle ? [{ targetType: "JOB_TITLE" as const, targetValue: user.jobTitle }] : []),
    ] },
  });
  const resolved = resolveAssignments([user], assignments);
  const [courses, progress] = await Promise.all([
    prisma.course.findMany({ where: { id: { in: resolved.map((r) => r.courseId) } }, select: { id: true, title: true, level: true, subject: { select: { name: true } } } }),
    prisma.courseProgress.findMany({ where: { userId, courseId: { in: resolved.map((r) => r.courseId) } } }),
  ]);
  const byId = new Map(courses.map((c) => [c.id, c]));
  const prog = new Map(progress.map((p) => [p.courseId, { completedAt: p.completedAt, completedCount: ((p.completedLessonIds as string[] | null) ?? []).length }]));
  return resolved
    .map((r) => ({
      courseId: r.courseId,
      title: byId.get(r.courseId)?.title ?? "",
      subject: byId.get(r.courseId)?.subject.name ?? "",
      level: byId.get(r.courseId)?.level,
      dueAt: r.dueAt,
      status: assignmentStatus(r.dueAt, prog.get(r.courseId) ?? null, now),
    }))
    .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) || a.title.localeCompare(b.title));
}
