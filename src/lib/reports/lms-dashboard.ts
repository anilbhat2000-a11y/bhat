import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { reportingLineIds } from "../auth/scope";
import { allAssignmentRefs, resolveAssignments } from "../learning/assignments";
import { assignedPathsByUser, pathProgress } from "../learning/paths";

export type Duration = "all" | "week" | "month" | "quarter" | "year";
export const DURATIONS: { key: Duration; label: string; days: number | null }[] = [
  { key: "week", label: "Last 7 days", days: 7 },
  { key: "month", label: "Last 30 days", days: 30 },
  { key: "quarter", label: "Last 90 days", days: 90 },
  { key: "year", label: "Last 12 months", days: 365 },
  { key: "all", label: "All time", days: null },
];
export function parseDuration(v: string | undefined): Duration {
  return DURATIONS.some((d) => d.key === v) ? (v as Duration) : "month";
}
export function sinceFor(duration: Duration, now: Date): Date {
  const days = DURATIONS.find((d) => d.key === duration)?.days;
  return days ? new Date(now.getTime() - days * 86_400_000) : new Date(0);
}

const DUE_SOON_DAYS = 14;

export type WorkItem = { userId: string; name: string; courseId: string; course: string; dueAt: Date | null; completedAt: Date | null };
export type Activity = { at: Date; text: string; kind: "course" | "certificate" | "assessment" };

// Splits assigned work into due soon (next 14 days), overdue and completed in the period.
export function bucketWork(items: WorkItem[], now: Date, since: Date) {
  const soonEnd = new Date(now.getTime() + DUE_SOON_DAYS * 86_400_000);
  const open = items.filter((i) => !i.completedAt);
  return {
    dueSoon: open.filter((i) => i.dueAt && i.dueAt >= now && i.dueAt <= soonEnd).sort((a, b) => +a.dueAt! - +b.dueAt!),
    overdue: open.filter((i) => i.dueAt && i.dueAt < now).sort((a, b) => +a.dueAt! - +b.dueAt!),
    completed: items.filter((i) => i.completedAt && i.completedAt >= since).sort((a, b) => +b.completedAt! - +a.completedAt!),
  };
}

// The people a dashboard covers: everyone active for admins, the reporting line for managers.
async function scopeUsers(viewer: SessionUser) {
  const all = await prisma.user.findMany({ select: { id: true, name: true, managerId: true, department: true, jobTitle: true, active: true } });
  const ids = viewer.role === "ADMIN" ? null : reportingLineIds(viewer.id, all);
  return all.filter((u) => u.active && (ids ? ids.has(u.id) : true));
}

export async function lmsDashboard(viewer: SessionUser, duration: Duration, now: Date = new Date()) {
  const since = sinceFor(duration, now);
  const users = await scopeUsers(viewer);
  const ids = users.map((u) => u.id);
  const name = new Map(users.map((u) => [u.id, u.name]));

  const [seen, worked, progress, certsIssued, certsValid, refs, pathRows, passed] = await Promise.all([
    prisma.session.findMany({ where: { userId: { in: ids }, lastSeenAt: { gte: since } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.lessonProgress.findMany({ where: { userId: { in: ids }, updatedAt: { gte: since } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.courseProgress.findMany({ where: { userId: { in: ids } }, select: { userId: true, courseId: true, completedLessonIds: true, completedAt: true, course: { select: { title: true } } } }),
    prisma.certification.findMany({ where: { userId: { in: ids }, issuedAt: { gte: since } }, select: { userId: true, issuedAt: true, level: true, subject: { select: { name: true } } }, orderBy: { issuedAt: "desc" } }),
    prisma.certification.count({ where: { userId: { in: ids }, expiresAt: { gt: now } } }),
    allAssignmentRefs(),
    assignedPathsByUser(users),
    prisma.assessmentAttempt.findMany({
      where: { userId: { in: ids }, passed: true, submittedAt: { gte: since } },
      select: { userId: true, submittedAt: true, scorePercent: true, period: { select: { assessment: { select: { title: true } } } } },
      orderBy: { submittedAt: "desc" }, take: 20,
    }),
  ]);

  // Learning paths: created (admins: all their paths; managers: paths their team is on) and
  // people who have finished every course of a path assigned to them.
  const completedSet = new Set(progress.filter((p) => p.completedAt).map((p) => `${p.userId}|${p.courseId}`));
  const pathIds = [...new Set(pathRows.map((r) => r.pathId))];
  const pathCourses = await prisma.learningPathCourse.findMany({ where: { pathId: { in: pathIds }, course: { status: "PUBLISHED" } }, select: { pathId: true, courseId: true } });
  const coursesOf = new Map<string, string[]>();
  for (const c of pathCourses) coursesOf.set(c.pathId, [...(coursesOf.get(c.pathId) ?? []), c.courseId]);
  const pathsCompleted = pathRows.filter((r) => {
    const list = coursesOf.get(r.pathId) ?? [];
    return pathProgress(list, new Set(list.filter((c) => completedSet.has(`${r.userId}|${c}`)))).completed;
  }).length;
  const pathsCreated = viewer.role === "ADMIN"
    ? await prisma.learningPath.count({ where: { isTemplate: false, createdAt: { gte: since } } })
    : pathIds.length;

  // Assigned work (courses assigned directly or through a path) for the three tabs.
  const assigned = resolveAssignments(users, refs);
  const titles = new Map((await prisma.course.findMany({ where: { id: { in: [...new Set(assigned.map((a) => a.courseId))] } }, select: { id: true, title: true } })).map((c) => [c.id, c.title]));
  const doneAt = new Map(progress.filter((p) => p.completedAt).map((p) => [`${p.userId}|${p.courseId}`, p.completedAt as Date]));
  const work = bucketWork(assigned.map((a) => ({
    userId: a.userId, name: name.get(a.userId) ?? "", courseId: a.courseId, course: titles.get(a.courseId) ?? "",
    dueAt: a.dueAt, completedAt: doneAt.get(`${a.userId}|${a.courseId}`) ?? null,
  })), now, since);

  // Recent activity in the team: course completions, certificates and passed assessments.
  const activity: Activity[] = [
    ...progress.filter((p) => p.completedAt && p.completedAt >= since).map((p) => ({ at: p.completedAt as Date, kind: "course" as const, text: `${name.get(p.userId)} completed ${p.course.title}` })),
    ...certsIssued.map((c) => ({ at: c.issuedAt, kind: "certificate" as const, text: `${name.get(c.userId)} earned the ${c.subject.name} ${c.level.toLowerCase()} certificate` })),
    ...passed.map((a) => ({ at: a.submittedAt as Date, kind: "assessment" as const, text: `${name.get(a.userId)} passed ${a.period.assessment.title} (${a.scorePercent}%)` })),
  ].sort((a, b) => +b.at - +a.at).slice(0, 12);

  const active = new Set([...seen.map((s) => s.userId), ...worked.map((w) => w.userId)]);
  return {
    since,
    members: { total: users.length, active: active.size },
    paths: { created: pathsCreated, completed: pathsCompleted, assignedPeople: new Set(pathRows.map((r) => r.userId)).size },
    courses: {
      inProgress: progress.filter((p) => !p.completedAt && ((p.completedLessonIds as string[] | null) ?? []).length > 0).length,
      completed: progress.filter((p) => p.completedAt && p.completedAt >= since).length,
    },
    certificates: { issued: certsIssued.length, valid: certsValid },
    work,
    activity,
  };
}

// Certificate figures and the searchable list for the certificates page.
export async function certificateOverview(viewer: SessionUser, opts: { duration: Duration; q: string }, now: Date = new Date()) {
  const since = sinceFor(opts.duration, now);
  const users = await scopeUsers(viewer);
  const ids = users.map((u) => u.id);
  const q = opts.q.trim().toLowerCase();
  const [refs, certs, expiring, valid] = await Promise.all([
    allAssignmentRefs(),
    prisma.certification.findMany({
      where: { userId: { in: ids }, issuedAt: { gte: since } },
      select: { id: true, level: true, issuedAt: true, expiresAt: true, verificationCode: true, subject: { select: { name: true } }, user: { select: { name: true, department: true } } },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.certification.count({ where: { userId: { in: ids }, expiresAt: { gt: now, lte: new Date(now.getTime() + 90 * 86_400_000) } } }),
    prisma.certification.count({ where: { userId: { in: ids }, expiresAt: { gt: now } } }),
  ]);
  const assigned = resolveAssignments(users, refs);
  const rows = certs.filter((c) => !q || c.subject.name.toLowerCase().includes(q) || c.user.name.toLowerCase().includes(q) || (c.user.department ?? "").toLowerCase().includes(q));
  return {
    stats: {
      assignedCourses: new Set(assigned.map((a) => a.courseId)).size,
      peopleAssigned: new Set(assigned.map((a) => a.userId)).size,
      valid,
      expiring,
    },
    rows: rows.slice(0, 500).map((c) => ({
      id: c.id, subject: c.subject.name, level: c.level, holder: c.user.name, department: c.user.department ?? "",
      issuedAt: c.issuedAt, expiresAt: c.expiresAt, code: c.verificationCode, valid: c.expiresAt > now,
    })),
    total: rows.length,
  };
}
