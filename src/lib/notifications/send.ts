import { prisma } from "../db/client";
import { periodKeyFor } from "../assessments/periods";
import type { Mailer } from "./mailer";
import { overdueByManager, remindersDue, type ReminderType } from "./reminders";

const SUBJECT: Record<ReminderType, (title: string) => string> = {
  DUE_SOON: (t) => `Due in a few days: ${t}`,
  DUE_TODAY: (t) => `Due today: ${t}`,
  OVERDUE: (t) => `Overdue: ${t}`,
};

// Sends each due reminder once and records it, so a failed send is retried next run and
// a successful one is never repeated. Mondays also send each manager the overdue list.
export async function sendReminders(
  now: Date,
  mailer: Mailer,
  opts: { skipDigest?: boolean } = {},
): Promise<{ sent: number }> {
  const periods = await prisma.assessmentPeriod.findMany({
    where: { status: { in: ["OPEN", "OVERDUE"] } },
    include: { user: true, assessment: true },
  });
  const sentKeys = new Set((await prisma.notification.findMany({ select: { key: true } })).map((n) => n.key));
  const due = remindersDue(periods.map((p) => ({ id: p.id, userId: p.userId, dueAt: p.dueAt, status: p.status })), now, sentKeys);
  const byId = new Map(periods.map((p) => [p.id, p]));

  let sent = 0;
  for (const r of due) {
    const p = byId.get(r.periodId);
    if (!p) continue;
    await mailer.send(p.user.email, SUBJECT[r.type](p.assessment.title), `Please complete "${p.assessment.title}" by ${p.dueAt.toISOString().slice(0, 10)}.`);
    await prisma.notification.create({ data: { userId: p.userId, key: r.key, type: r.type } });
    sent++;
  }

  if (!opts.skipDigest && now.getUTCDay() === 1) {
    const week = periodKeyFor("WEEKLY", now);
    const users = await prisma.user.findMany({ select: { id: true, managerId: true, email: true } });
    const titles = new Map(periods.map((p) => [p.id, p.assessment.title]));
    const rows = periods.map((p) => ({ userId: p.userId, status: p.status, title: titles.get(p.id) ?? "" }));
    for (const [managerId, items] of overdueByManager(rows, users)) {
      const key = `digest:${managerId}:${week}`;
      if (sentKeys.has(key)) continue;
      const manager = users.find((u) => u.id === managerId);
      if (!manager) continue;
      const list = items.map((i) => `- ${i.title}`).join("\n");
      await mailer.send(manager.email, "Your team's overdue assessments", `These team members have overdue assessments:\n${list}`);
      await prisma.notification.create({ data: { userId: managerId, key, type: "DIGEST" } });
      sent++;
    }
  }
  return { sent };
}
