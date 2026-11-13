import type { PeriodStatus } from "../../generated/prisma/client";

export type ReminderType = "DUE_SOON" | "DUE_TODAY" | "OVERDUE";
export type ReminderPeriod = { id: string; userId: string; dueAt: Date; status: PeriodStatus };
export type DueReminder = { key: string; periodId: string; userId: string; type: ReminderType };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Each reminder type is sent at most once per period: the key is the period and the type.
export function remindersDue(periods: ReminderPeriod[], now: Date, alreadySent: Set<string>): DueReminder[] {
  const out: DueReminder[] = [];
  for (const p of periods) {
    if (p.status === "PASSED") continue;
    const untilDue = p.dueAt.getTime() - now.getTime();
    let type: ReminderType | null = null;
    if (untilDue < 0 && (p.status === "OPEN" || p.status === "OVERDUE")) type = "OVERDUE";
    else if (untilDue >= 0 && untilDue <= 24 * HOUR) type = "DUE_TODAY";
    else if (untilDue > DAY && untilDue <= 3 * DAY) type = "DUE_SOON";
    if (!type) continue;
    const key = `${p.id}:${type}`;
    if (alreadySent.has(key)) continue;
    out.push({ key, periodId: p.id, userId: p.userId, type });
  }
  return out;
}

// Overdue periods for each manager's direct reports. Rows with other statuses are ignored.
export function overdueByManager(
  rows: { userId: string; status: PeriodStatus; title: string }[],
  users: { id: string; managerId: string | null }[],
): Map<string, { userId: string; title: string }[]> {
  const managerOf = new Map(users.map((u) => [u.id, u.managerId]));
  const digest = new Map<string, { userId: string; title: string }[]>();
  for (const r of rows) {
    if (r.status !== "OVERDUE") continue;
    const manager = managerOf.get(r.userId);
    if (!manager) continue;
    const list = digest.get(manager) ?? [];
    list.push({ userId: r.userId, title: r.title });
    digest.set(manager, list);
  }
  return digest;
}
