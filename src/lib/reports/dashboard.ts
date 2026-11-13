import type { SessionUser } from "../auth/session";
import {
  applyFilters, assessmentView, certificationView, completionTrend, completionView, departmentView, expiryForecast,
  loadRows, peopleView, type Filters,
} from "./analytics";

// The admin dashboard as named tables. The page and the CSV export both use these, so a
// downloaded file always matches what is on screen.
export type Table = { title: string; columns: string[]; rows: Record<string, string | number | null>[] };

export const SECTIONS = [
  "certifications", "completion-by-subject", "completion-by-course", "completion-trend",
  "assessments", "departments", "top-performers", "needs-support", "expiry-forecast",
] as const;
export type Section = (typeof SECTIONS)[number];

export async function adminDashboard(viewer: SessionUser, filters: Filters, now: Date = new Date()): Promise<Record<Section, Table>> {
  const rows = applyFilters(await loadRows(viewer), filters);
  const certs = certificationView(rows, filters.period, now);
  const completion = completionView(rows, filters.period, now);
  const people = peopleView(rows, filters.period, now);
  return {
    "certifications": {
      title: "Certifications by subject",
      columns: ["subject", "basic", "intermediate", "advanced", "active", "expired"],
      rows: certs.map((s) => ({ subject: s.subject, basic: s.byLevel.BASIC, intermediate: s.byLevel.INTERMEDIATE, advanced: s.byLevel.ADVANCED, active: s.active, expired: s.expired })),
    },
    "completion-by-subject": {
      title: "Course completion by subject",
      columns: ["subject", "started", "completed", "rate_percent"],
      rows: completion.bySubject.map((s) => ({ subject: s.subject, started: s.started, completed: s.completed, rate_percent: s.rate })),
    },
    "completion-by-course": {
      title: "Course completion by course",
      columns: ["course", "subject", "level", "started", "completed", "rate_percent"],
      rows: completion.byCourse.map((c) => ({ course: c.course, subject: c.subject, level: c.level, started: c.started, completed: c.completed, rate_percent: c.rate })),
    },
    "completion-trend": {
      title: "Course completions per month",
      columns: ["month", "completions"],
      rows: completionTrend(rows, now),
    },
    "assessments": {
      title: "Assessment results by subject and type",
      columns: ["subject", "cadence", "attempts", "pass_rate_percent", "average_score", "periods_1_attempt", "periods_2_attempts", "periods_3_plus_attempts"],
      rows: assessmentView(rows, filters.period, now).map((a) => ({
        subject: a.subject, cadence: a.cadence, attempts: a.attempts, pass_rate_percent: a.passRate, average_score: a.averageScore,
        periods_1_attempt: a.periodsWithOneAttempt, periods_2_attempts: a.periodsWithTwoAttempts, periods_3_plus_attempts: a.periodsWithThreeOrMore,
      })),
    },
    "departments": {
      title: "Overdue and not-started assessments by department",
      columns: ["department", "people", "overdue", "not_started"],
      rows: departmentView(rows).map((d) => ({ department: d.department, people: d.people, overdue: d.overdue, not_started: d.notStarted })),
    },
    "top-performers": {
      title: "Top performers",
      columns: ["name", "department", "attempts", "average_score"],
      rows: people.top.map((p) => ({ name: p.name, department: p.department, attempts: p.attempts, average_score: p.averageScore })),
    },
    "needs-support": {
      title: "Learners who need support",
      columns: ["name", "department", "overdue", "failed_attempts", "average_score"],
      rows: people.support.map((p) => ({ name: p.name, department: p.department, overdue: p.overdue, failed_attempts: p.failed, average_score: p.averageScore })),
    },
    "expiry-forecast": {
      title: "Certificates expiring soon",
      columns: ["subject", "within_30_days", "within_31_to_60_days", "within_61_to_90_days"],
      rows: expiryForecast(rows, now).map((e) => ({ subject: e.subject, within_30_days: e.in30, within_31_to_60_days: e.in60, within_61_to_90_days: e.in90 })),
    },
  };
}
