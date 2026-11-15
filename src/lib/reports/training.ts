import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import type { AssignmentTarget } from "../../generated/prisma/client";
import { scopeFor } from "./queries";

// Employee training report: for each person, the courses assigned to them (directly, through
// their department or job title, or through a learning path), the assignment period (assigned
// on → due by), what they have completed, and how far through each course they are.

export type TrainingStatus = "Completed" | "Overdue" | "In progress" | "Not started";
export type TrainingRow = {
  courseId: string;
  course: string;
  subject: string;
  assignedVia: string;
  assignedAt: Date;
  dueAt: Date | null;
  lessonsDone: number;
  lessonsTotal: number;
  percent: number;
  status: TrainingStatus;
  completedAt: Date | null;
};
export type EmployeeReport = {
  id: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  manager: string;
  trainings: TrainingRow[];
  assigned: number;
  completed: number;
  inProgress: number;
  overdue: number;
  notStarted: number;
  completionPercent: number; // completed ÷ assigned
  progressPercent: number; // average progress across assigned courses
};
export type TrainingFilters = { q?: string; department?: string; status?: "overdue" | "incomplete" | "complete" | "none"; from?: Date; to?: Date };

type Ref = { courseId: string; targetType: AssignmentTarget; targetValue: string; dueAt: Date | null; createdAt: Date; via: string };

const TARGET_LABEL: Record<AssignmentTarget, string> = { USER: "Directly", DEPARTMENT: "Department", JOB_TITLE: "Job title" };

export function trainingStatus(dueAt: Date | null, completedAt: Date | null, lessonsDone: number, now: Date): TrainingStatus {
  if (completedAt) return "Completed";
  if (dueAt && dueAt.getTime() < now.getTime()) return "Overdue";
  return lessonsDone > 0 ? "In progress" : "Not started";
}

// Pure: turns users, assignment references, courses and progress into the report.
export function buildTrainingReport(
  users: { id: string; name: string; email: string; department: string | null; jobTitle: string | null; manager: string | null }[],
  refs: Ref[],
  courses: Map<string, { title: string; subject: string; lessonIds: string[] }>,
  progress: Map<string, { completedAt: Date | null; completedLessonIds: string[] }>,
  now: Date,
): EmployeeReport[] {
  return users.map((u) => {
    const mine = new Map<string, { assignedAt: Date; dueAt: Date | null; via: Set<string> }>();
    for (const r of refs) {
      const covered = r.targetType === "USER" ? r.targetValue === u.id
        : r.targetType === "DEPARTMENT" ? !!u.department && u.department === r.targetValue
          : !!u.jobTitle && u.jobTitle === r.targetValue;
      if (!covered || !courses.has(r.courseId)) continue;
      const prev = mine.get(r.courseId);
      if (!prev) {
        mine.set(r.courseId, { assignedAt: r.createdAt, dueAt: r.dueAt, via: new Set([r.via]) });
      } else {
        // Covered more than once: the earliest assignment and the earliest due date apply.
        if (r.createdAt < prev.assignedAt) prev.assignedAt = r.createdAt;
        if (r.dueAt && (!prev.dueAt || r.dueAt < prev.dueAt)) prev.dueAt = r.dueAt;
        prev.via.add(r.via);
      }
    }
    const trainings: TrainingRow[] = [...mine.entries()].map(([courseId, a]) => {
      const c = courses.get(courseId)!;
      const p = progress.get(`${u.id}|${courseId}`);
      const current = new Set(c.lessonIds);
      const lessonsDone = (p?.completedLessonIds ?? []).filter((id) => current.has(id)).length;
      const lessonsTotal = c.lessonIds.length;
      const completedAt = p?.completedAt ?? null;
      const percent = completedAt ? 100 : lessonsTotal === 0 ? 0 : Math.min(99, Math.floor((lessonsDone / lessonsTotal) * 100));
      return {
        courseId, course: c.title, subject: c.subject, assignedVia: [...a.via].join("; "), assignedAt: a.assignedAt, dueAt: a.dueAt,
        lessonsDone: completedAt ? lessonsTotal : lessonsDone, lessonsTotal, percent, status: trainingStatus(a.dueAt, completedAt, lessonsDone, now), completedAt,
      };
    }).sort((x, y) => (x.dueAt?.getTime() ?? Infinity) - (y.dueAt?.getTime() ?? Infinity) || x.course.localeCompare(y.course));
    const count = (s: TrainingStatus) => trainings.filter((t) => t.status === s).length;
    const assigned = trainings.length;
    const completed = count("Completed");
    return {
      id: u.id, name: u.name, email: u.email, department: u.department ?? "", jobTitle: u.jobTitle ?? "", manager: u.manager ?? "",
      trainings, assigned, completed, inProgress: count("In progress"), overdue: count("Overdue"), notStarted: count("Not started"),
      completionPercent: assigned === 0 ? 0 : Math.round((completed / assigned) * 100),
      progressPercent: assigned === 0 ? 0 : Math.round(trainings.reduce((n, t) => n + t.percent, 0) / assigned),
    };
  });
}

export function filterTrainingReport(rows: EmployeeReport[], f: TrainingFilters): EmployeeReport[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return rows
    .map((e) => {
      // The assignment-period filter keeps courses assigned within the dates.
      if (!f.from && !f.to) return e;
      const trainings = e.trainings.filter((t) => (!f.from || t.assignedAt >= f.from) && (!f.to || t.assignedAt <= f.to));
      return { ...e, ...recount(trainings) };
    })
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
    .filter((e) => !f.department || e.department === f.department)
    .filter((e) => {
      switch (f.status) {
        case "overdue": return e.overdue > 0;
        case "incomplete": return e.assigned > e.completed;
        case "complete": return e.assigned > 0 && e.completed === e.assigned;
        case "none": return e.assigned === 0;
        default: return true;
      }
    });
}

function recount(trainings: TrainingRow[]) {
  const count = (s: TrainingStatus) => trainings.filter((t) => t.status === s).length;
  const assigned = trainings.length;
  const completed = count("Completed");
  return {
    trainings, assigned, completed, inProgress: count("In progress"), overdue: count("Overdue"), notStarted: count("Not started"),
    completionPercent: assigned === 0 ? 0 : Math.round((completed / assigned) * 100),
    progressPercent: assigned === 0 ? 0 : Math.round(trainings.reduce((n, t) => n + t.percent, 0) / assigned),
  };
}

// Reads everything for the viewer: admins see every active employee, managers their team.
export async function trainingReport(viewer: SessionUser, now: Date = new Date()): Promise<EmployeeReport[]> {
  const scope = await scopeFor(viewer);
  const [people, direct, paths, courses, progress] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, ...(scope ? { id: { in: [...scope].filter((id) => id !== viewer.id) } } : {}) },
      select: { id: true, name: true, email: true, department: true, jobTitle: true, manager: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.courseAssignment.findMany({ where: { course: { status: "PUBLISHED" } }, select: { courseId: true, targetType: true, targetValue: true, dueAt: true, createdAt: true } }),
    prisma.learningPathAssignment.findMany({
      where: { path: { isTemplate: false } },
      select: { targetType: true, targetValue: true, dueAt: true, createdAt: true, path: { select: { title: true, courses: { where: { course: { status: "PUBLISHED" } }, select: { courseId: true } } } } },
    }),
    prisma.course.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, subject: { select: { name: true } }, lessons: { select: { id: true } } } }),
    prisma.courseProgress.findMany({ select: { userId: true, courseId: true, completedAt: true, completedLessonIds: true } }),
  ]);
  const refs: Ref[] = [
    ...direct.map((a) => ({ ...a, via: TARGET_LABEL[a.targetType] })),
    ...paths.flatMap((a) => a.path.courses.map((c) => ({ courseId: c.courseId, targetType: a.targetType, targetValue: a.targetValue, dueAt: a.dueAt, createdAt: a.createdAt, via: `Path: ${a.path.title}` }))),
  ];
  const courseMap = new Map(courses.map((c) => [c.id, { title: c.title, subject: c.subject.name, lessonIds: c.lessons.map((l) => l.id) }]));
  const progressMap = new Map(progress.map((p) => [`${p.userId}|${p.courseId}`, { completedAt: p.completedAt, completedLessonIds: (p.completedLessonIds as string[] | null) ?? [] }]));
  const users = people.map((p) => ({ id: p.id, name: p.name, email: p.email, department: p.department, jobTitle: p.jobTitle, manager: p.manager?.name ?? null }));
  return buildTrainingReport(users, refs, courseMap, progressMap, now);
}

export function parseTrainingFilters(sp: Record<string, string | string[] | undefined>): TrainingFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const date = (v?: string, end = false) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T${end ? "23:59:59.999" : "00:00:00"}+05:30`) : undefined);
  const status = one("status");
  return {
    q: one("q")?.slice(0, 100),
    department: one("department") || undefined,
    status: status === "overdue" || status === "incomplete" || status === "complete" || status === "none" ? status : undefined,
    from: date(one("from")),
    to: date(one("to"), true),
  };
}
