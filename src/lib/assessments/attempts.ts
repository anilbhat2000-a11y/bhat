import type { PeriodStatus } from "../../generated/prisma/client";

// A new attempt is refused once the period is passed or overdue, or the limit is reached.
export function canStartAttempt(attemptsInPeriod: number, maxAttempts: number, periodStatus: PeriodStatus): boolean {
  if (periodStatus !== "OPEN") return false;
  return attemptsInPeriod < maxAttempts;
}

// A null limit means untimed. Otherwise a submit at exactly the limit is accepted.
export function isWithinTimeLimit(startedAt: Date, submittedAt: Date, limitMinutes: number | null): boolean {
  if (limitMinutes === null) return true;
  return submittedAt.getTime() <= startedAt.getTime() + limitMinutes * 60_000;
}
