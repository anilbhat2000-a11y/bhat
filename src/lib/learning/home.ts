import type { Cadence, PeriodStatus } from "../../generated/prisma/client";

export type PeriodLike = { cadence: Cadence; status: PeriodStatus; dueAt: Date };

// Open periods that have not yet reached their due time, counted by cadence.
// Overdue periods are counted separately, and passed periods are not counted at all.
export function dueSummary(periods: PeriodLike[], now: Date) {
  const openAndDue = (p: PeriodLike, cadence: Cadence) =>
    p.cadence === cadence && p.status === "OPEN" && p.dueAt.getTime() >= now.getTime();
  return {
    thisWeek: periods.filter((p) => openAndDue(p, "WEEKLY")).length,
    thisMonth: periods.filter((p) => openAndDue(p, "MONTHLY")).length,
    thisYear: periods.filter((p) => openAndDue(p, "ANNUAL")).length,
    overdue: periods.filter((p) => p.status === "OVERDUE").length,
  };
}
