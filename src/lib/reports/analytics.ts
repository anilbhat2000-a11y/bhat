import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import type { Cadence, Level } from "../../generated/prisma/client";
import { scopeFor } from "./queries";
import { certsBySubject, latestPerPerson } from "./aggregate";

// Dashboard analytics (brief section 7). The loader reads the rows a viewer may see once;
// every view is then a pure function of those rows, so the numbers are easy to test against
// the database.

export type Period = "all" | "week" | "month" | "year";
export type Filters = { level?: Level; department?: string; location?: string; period: Period };

const DAY = 24 * 3600_000;
const WINDOW: Record<Exclude<Period, "all">, number> = { week: 7 * DAY, month: 30 * DAY, year: 365 * DAY };
const LEVELS: Level[] = ["BASIC", "INTERMEDIATE", "ADVANCED"];

export function parseFilters(q: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (Array.isArray(q[k]) ? q[k]?.[0] : q[k])?.trim() || undefined;
  const level = one("level");
  const period = one("period");
  return {
    level: LEVELS.includes(level as Level) ? (level as Level) : undefined,
    department: one("department"),
    location: one("location"),
    period: period === "week" || period === "month" || period === "year" ? period : "all",
  };
}

// The start of the reporting window, or null for all time. Rolling windows: the last 7 days,
// 30 days, or 365 days.
export function windowStart(period: Period, now: Date): Date | null {
  return period === "all" ? null : new Date(now.getTime() - WINDOW[period]);
}

const within = (d: Date | null | undefined, since: Date | null, now: Date) =>
  !!d && (since === null || d.getTime() >= since.getTime()) && d.getTime() <= now.getTime();

const pct = (part: number, whole: number) => (whole === 0 ? null : Math.round((part / whole) * 1000) / 10);
const avg = (xs: number[]) => (xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10);

// --- Row types (what the loader returns) --------------------------------------------------

export type UserRow = { id: string; name: string; department: string; location: string };
export type CourseRow = { id: string; title: string; subject: string; level: Level; lessonCount: number };
export type ProgressRow = { userId: string; courseId: string; completedCount: number; completedAt: Date | null };
export type AttemptRow = {
  userId: string; periodId: string; subject: string; level: Level; cadence: Cadence; assessment: string;
  submittedAt: Date; scorePercent: number; passed: boolean; passMarkPercent: number;
};
export type PeriodRow = { id: string; userId: string; subject: string; level: Level; status: "OPEN" | "PASSED" | "OVERDUE"; attemptCount: number; dueAt: Date };
export type CertRow = { userId: string; subject: string; level: Level; issuedAt: Date; expiresAt: Date };
export type Rows = { users: UserRow[]; courses: CourseRow[]; progress: ProgressRow[]; attempts: AttemptRow[]; periods: PeriodRow[]; certs: CertRow[] };

// --- Filtering ----------------------------------------------------------------------------

// Applies department, location and level filters. The period applies inside each view,
// because each view dates a different event (issue, completion, submit).
export function applyFilters(rows: Rows, f: Filters): Rows {
  const users = rows.users.filter((u) => (!f.department || u.department === f.department) && (!f.location || u.location === f.location));
  const ids = new Set(users.map((u) => u.id));
  const levelOk = (l: Level) => !f.level || l === f.level;
  const courses = rows.courses.filter((c) => levelOk(c.level));
  const courseIds = new Set(courses.map((c) => c.id));
  return {
    users,
    courses,
    progress: rows.progress.filter((p) => ids.has(p.userId) && courseIds.has(p.courseId)),
    attempts: rows.attempts.filter((a) => ids.has(a.userId) && levelOk(a.level)),
    periods: rows.periods.filter((p) => ids.has(p.userId) && levelOk(p.level)),
    certs: rows.certs.filter((c) => ids.has(c.userId) && levelOk(c.level)),
  };
}

// --- Views --------------------------------------------------------------------------------

// Latest certificate per person, subject and level, issued in the window.
export function certificationView(rows: Rows, period: Period, now: Date) {
  const since = windowStart(period, now);
  const certs = latestPerPerson(rows.certs.map((c) => ({ ...c }))).filter((c) => within(c.issuedAt, since, now));
  return certsBySubject(certs, now);
}

// Started = has a progress row; completed = finished the course (in the window, if set).
export function completionView(rows: Rows, period: Period, now: Date) {
  const since = windowStart(period, now);
  const byCourse = rows.courses.map((c) => {
    const progress = rows.progress.filter((p) => p.courseId === c.id);
    const completed = progress.filter((p) => within(p.completedAt, since, now)).length;
    return { course: c.title, subject: c.subject, level: c.level, started: progress.length, completed, rate: pct(completed, progress.length) };
  }).filter((r) => r.started > 0).sort((a, b) => a.subject.localeCompare(b.subject) || a.course.localeCompare(b.course));
  const subjects = new Map<string, { subject: string; started: number; completed: number }>();
  for (const r of byCourse) {
    const s = subjects.get(r.subject) ?? { subject: r.subject, started: 0, completed: 0 };
    s.started += r.started;
    s.completed += r.completed;
    subjects.set(r.subject, s);
  }
  const bySubject = [...subjects.values()].map((s) => ({ ...s, rate: pct(s.completed, s.started) }));
  return { byCourse, bySubject };
}

// Course completions per calendar month (UTC) for the last `months` months, oldest first.
export function completionTrend(rows: Rows, now: Date, months = 6) {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const p of rows.progress) {
    const k = p.completedAt?.toISOString().slice(0, 7);
    if (k && counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return keys.map((month) => ({ month, completions: counts.get(month) ?? 0 }));
}

// Submitted attempts in the window, by subject and cadence; and how many attempts each
// finished period took (attempt distribution).
export function assessmentView(rows: Rows, period: Period, now: Date) {
  const since = windowStart(period, now);
  const attempts = rows.attempts.filter((a) => within(a.submittedAt, since, now));
  const groups = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    const key = `${a.subject}|${a.cadence}`;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const bySubject = [...groups.entries()].map(([key, list]) => {
    const [subject, cadence] = key.split("|");
    const perPeriod = new Map<string, number>();
    for (const a of list) perPeriod.set(a.periodId, (perPeriod.get(a.periodId) ?? 0) + 1);
    const dist = { one: 0, two: 0, threePlus: 0 };
    for (const n of perPeriod.values()) {
      if (n === 1) dist.one++;
      else if (n === 2) dist.two++;
      else dist.threePlus++;
    }
    return {
      subject, cadence: cadence as Cadence, attempts: list.length,
      passRate: pct(list.filter((a) => a.passed).length, list.length),
      averageScore: avg(list.map((a) => a.scorePercent)),
      periodsWithOneAttempt: dist.one, periodsWithTwoAttempts: dist.two, periodsWithThreeOrMore: dist.threePlus,
    };
  }).sort((a, b) => a.subject.localeCompare(b.subject) || a.cadence.localeCompare(b.cadence));
  return bySubject;
}

// Current state, not windowed: overdue periods, and open periods with no attempt yet.
export function departmentView(rows: Rows) {
  const dept = new Map(rows.users.map((u) => [u.id, u.department || "(no department)"]));
  const tally = new Map<string, { department: string; overdue: number; notStarted: number; people: number }>();
  const row = (d: string) => tally.get(d) ?? { department: d, overdue: 0, notStarted: 0, people: 0 };
  for (const u of rows.users) {
    const r = row(dept.get(u.id) ?? "");
    r.people++;
    tally.set(r.department, r);
  }
  for (const p of rows.periods) {
    const r = row(dept.get(p.userId) ?? "(no department)");
    if (p.status === "OVERDUE") r.overdue++;
    else if (p.status === "OPEN" && p.attemptCount === 0) r.notStarted++;
    tally.set(r.department, r);
  }
  return [...tally.values()].sort((a, b) => a.department.localeCompare(b.department));
}

// Top performers: highest average score with at least `minAttempts` attempts in the window.
// Needs support: overdue work, two or more fails in the window, or an average below 50%.
export function peopleView(rows: Rows, period: Period, now: Date, opts = { top: 5, minAttempts: 2 }) {
  const since = windowStart(period, now);
  const attempts = rows.attempts.filter((a) => within(a.submittedAt, since, now));
  const people = rows.users.map((u) => {
    const mine = attempts.filter((a) => a.userId === u.id);
    return {
      name: u.name, department: u.department,
      attempts: mine.length,
      averageScore: avg(mine.map((a) => a.scorePercent)),
      failed: mine.filter((a) => !a.passed).length,
      overdue: rows.periods.filter((p) => p.userId === u.id && p.status === "OVERDUE").length,
    };
  });
  const top = people
    .filter((p) => p.attempts >= opts.minAttempts && p.averageScore !== null)
    .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0) || b.attempts - a.attempts)
    .slice(0, opts.top);
  const support = people
    .filter((p) => p.overdue > 0 || p.failed >= 2 || (p.averageScore !== null && p.averageScore < 50))
    .sort((a, b) => b.overdue - a.overdue || b.failed - a.failed || (a.averageScore ?? 100) - (b.averageScore ?? 100));
  return { top, support };
}

// Active certificates (latest per person, subject and level) expiring in the next 30, 60
// and 90 days, by subject, for re-certification planning.
export function expiryForecast(rows: Rows, now: Date) {
  const active = latestPerPerson(rows.certs.map((c) => ({ ...c }))).filter((c) => c.expiresAt.getTime() > now.getTime());
  const bySubject = new Map<string, { subject: string; in30: number; in60: number; in90: number }>();
  for (const c of active) {
    const days = (c.expiresAt.getTime() - now.getTime()) / DAY;
    if (days > 90) continue;
    const r = bySubject.get(c.subject) ?? { subject: c.subject, in30: 0, in60: 0, in90: 0 };
    if (days <= 30) r.in30++;
    else if (days <= 60) r.in60++;
    else r.in90++;
    bySubject.set(c.subject, r);
  }
  return [...bySubject.values()].sort((a, b) => a.subject.localeCompare(b.subject));
}

// --- Team heat map and personal views -----------------------------------------------------

export type HeatCell = "Certified" | "Weak" | "In progress" | "Not started";

// Per person and subject: certified (an active certificate), weak (failed attempts and no
// pass), in progress (some lessons done or an attempt made), or not started.
export function heatMap(rows: Rows, subjects: string[], now: Date): { name: string; userId: string; cells: Record<string, HeatCell> }[] {
  const courseSubject = new Map(rows.courses.map((c) => [c.id, c.subject]));
  return rows.users.map((u) => {
    const cells: Record<string, HeatCell> = {};
    for (const s of subjects) {
      const certified = rows.certs.some((c) => c.userId === u.id && c.subject === s && c.expiresAt.getTime() > now.getTime());
      const attempts = rows.attempts.filter((a) => a.userId === u.id && a.subject === s);
      const started = rows.progress.some((p) => p.userId === u.id && courseSubject.get(p.courseId) === s && p.completedCount > 0);
      if (certified) cells[s] = "Certified";
      else if (attempts.some((a) => !a.passed) && !attempts.some((a) => a.passed)) cells[s] = "Weak";
      else if (started || attempts.length > 0) cells[s] = "In progress";
      else cells[s] = "Not started";
    }
    return { name: u.name, userId: u.id, cells };
  });
}

// Subjects where a person's average score is below their pass marks (weak topics), worst first.
// Questions are not tagged below subject level yet, so the subject is the topic.
export function weakTopics(attempts: AttemptRow[]) {
  const bySubject = new Map<string, AttemptRow[]>();
  for (const a of attempts) bySubject.set(a.subject, [...(bySubject.get(a.subject) ?? []), a]);
  return [...bySubject.entries()]
    .map(([subject, list]) => ({
      subject,
      attempts: list.length,
      averageScore: avg(list.map((a) => a.scorePercent)) ?? 0,
      passMark: avg(list.map((a) => a.passMarkPercent)) ?? 0,
      lastPassed: [...list].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0].passed,
    }))
    .filter((s) => s.averageScore < s.passMark || !s.lastPassed)
    .sort((a, b) => a.averageScore - b.averageScore);
}

// Per subject and level, the share of lessons a learner has completed across published courses.
export function subjectProgress(courses: CourseRow[], progress: ProgressRow[]) {
  const done = new Map(progress.map((p) => [p.courseId, p.completedCount]));
  const rows = new Map<string, { subject: string; level: Level; lessons: number; completed: number }>();
  for (const c of courses) {
    if (!done.has(c.id)) continue; // only subjects the learner has started
    const key = `${c.subject}|${c.level}`;
    const r = rows.get(key) ?? { subject: c.subject, level: c.level, lessons: 0, completed: 0 };
    r.lessons += c.lessonCount;
    r.completed += Math.min(done.get(c.id) ?? 0, c.lessonCount);
    rows.set(key, r);
  }
  return [...rows.values()]
    .map((r) => ({ ...r, percent: r.lessons === 0 ? 0 : Math.round((r.completed / r.lessons) * 100) }))
    .sort((a, b) => a.subject.localeCompare(b.subject) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
}

// For each weak subject, the lowest-level published course the learner has not completed.
export function recommendations(weak: { subject: string }[], courses: CourseRow[], progress: ProgressRow[]) {
  const completed = new Set(progress.filter((p) => p.completedAt).map((p) => p.courseId));
  return weak.flatMap((w) => {
    const next = courses
      .filter((c) => c.subject === w.subject && !completed.has(c.id))
      .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.title.localeCompare(b.title))[0];
    return next ? [{ subject: w.subject, courseId: next.id, course: next.title, level: next.level }] : [];
  });
}

// --- Loader -------------------------------------------------------------------------------

// Everything the viewer may see: admins see everyone; managers their reporting line;
// `onlyUserId` narrows to one person (the learner's own dashboard).
export async function loadRows(viewer: SessionUser, opts: { onlyUserId?: string } = {}): Promise<Rows> {
  const scope = opts.onlyUserId ? new Set([opts.onlyUserId]) : await scopeFor(viewer);
  const userWhere = scope === null ? { active: true } : { id: { in: [...scope] }, active: true };
  const userIdIn = scope === null ? undefined : { in: [...scope] };
  const [users, courses, progress, attempts, periods, certs] = await Promise.all([
    prisma.user.findMany({ where: userWhere, select: { id: true, name: true, department: true, location: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, level: true, subject: { select: { name: true } }, _count: { select: { lessons: true } } } }),
    prisma.courseProgress.findMany({ where: { userId: userIdIn }, select: { userId: true, courseId: true, completedLessonIds: true, completedAt: true } }),
    prisma.assessmentAttempt.findMany({
      where: { userId: userIdIn, status: "SUBMITTED", submittedAt: { not: null }, scorePercent: { not: null } },
      select: { userId: true, periodId: true, submittedAt: true, scorePercent: true, passed: true,
        period: { select: { assessment: { select: { title: true, cadence: true, level: true, passMarkPercent: true, subject: { select: { name: true } } } } } } },
    }),
    prisma.assessmentPeriod.findMany({
      where: { userId: userIdIn, assessment: { published: true } },
      select: { id: true, userId: true, status: true, dueAt: true, assessment: { select: { level: true, subject: { select: { name: true } } } },
        _count: { select: { attempts: { where: { status: { not: "VOIDED" } } } } } },
    }),
    prisma.certification.findMany({ where: { userId: userIdIn }, select: { userId: true, level: true, issuedAt: true, expiresAt: true, subject: { select: { name: true } } } }),
  ]);
  return {
    users: users.map((u) => ({ id: u.id, name: u.name, department: u.department ?? "", location: u.location ?? "" })),
    courses: courses.map((c) => ({ id: c.id, title: c.title, subject: c.subject.name, level: c.level, lessonCount: c._count.lessons })),
    progress: progress.map((p) => ({ userId: p.userId, courseId: p.courseId, completedCount: ((p.completedLessonIds as string[] | null) ?? []).length, completedAt: p.completedAt })),
    attempts: attempts.map((a) => ({
      userId: a.userId, periodId: a.periodId, subject: a.period.assessment.subject.name, level: a.period.assessment.level,
      cadence: a.period.assessment.cadence, assessment: a.period.assessment.title, submittedAt: a.submittedAt as Date,
      scorePercent: a.scorePercent as number, passed: a.passed === true, passMarkPercent: a.period.assessment.passMarkPercent,
    })),
    periods: periods.map((p) => ({
      id: p.id, userId: p.userId, subject: p.assessment.subject.name, level: p.assessment.level,
      status: p.status, attemptCount: p._count.attempts, dueAt: p.dueAt,
    })),
    certs: certs.map((c) => ({ userId: c.userId, subject: c.subject.name, level: c.level, issuedAt: c.issuedAt, expiresAt: c.expiresAt })),
  };
}

export async function filterOptions() {
  const users = await prisma.user.findMany({ where: { active: true }, select: { department: true, location: true } });
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();
  return { departments: uniq(users.map((u) => u.department)), locations: uniq(users.map((u) => u.location)) };
}
