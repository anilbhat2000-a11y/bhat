import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { allAssignmentRefs, resolveAssignments } from "./assignments";

// Department-specific courses: a course lists the departments it is for; an empty list
// means everyone. Department names are compared without regard to case or extra spaces.
const norm = (s: string) => s.trim().toLowerCase();
export function departmentAllows(departments: string[], userDepartment: string | null | undefined): boolean {
  if (departments.length === 0) return true;
  return !!userDepartment && departments.some((d) => norm(d) === norm(userDepartment));
}

export function cleanDepartments(values: string[]): string[] {
  const out = new Map<string, string>();
  for (const v of values) {
    const t = v.trim().replace(/\s+/g, " ");
    if (t && t.length <= 100 && !out.has(norm(t))) out.set(norm(t), t);
  }
  return [...out.values()].sort((a, b) => a.localeCompare(b));
}

// Ids of courses this person may not see: courses for other departments that are neither
// assigned to them nor already started. Admins see everything.
export async function hiddenCourseIds(user: SessionUser): Promise<Set<string>> {
  if (user.role === "ADMIN") return new Set();
  const restricted = await prisma.course.findMany({ where: { NOT: { departments: { isEmpty: true } } }, select: { id: true, departments: true } });
  if (restricted.length === 0) return new Set();
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, department: true, jobTitle: true } });
  const notMine = restricted.filter((c) => !departmentAllows(c.departments, me?.department));
  if (notMine.length === 0) return new Set();
  const ids = notMine.map((c) => c.id);
  const [refs, started] = await Promise.all([
    allAssignmentRefs(),
    prisma.courseProgress.findMany({ where: { userId: user.id, courseId: { in: ids } }, select: { courseId: true } }),
  ]);
  const assigned = new Set(me ? resolveAssignments([me], refs.filter((r) => ids.includes(r.courseId))).map((a) => a.courseId) : []);
  const startedIds = new Set(started.map((s) => s.courseId));
  return new Set(ids.filter((id) => !assigned.has(id) && !startedIds.has(id)));
}

export async function canSeeCourse(user: SessionUser, courseId: string): Promise<boolean> {
  return !(await hiddenCourseIds(user)).has(courseId);
}
