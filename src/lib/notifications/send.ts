import { prisma } from "../db/client";
import { periodKeyFor } from "../assessments/periods";
import type { Mailer } from "./mailer";
import { overdueByManager, remindersDue, type ReminderType } from "./reminders";
import { allAssignmentRefs, resolveAssignments } from "../learning/assignments";

const SUBJECT: Record<ReminderType, (title: string) => string> = {
  DUE_SOON: (t) => `Due in a few days: ${t}`,
  DUE_TODAY: (t) => `Due today: ${t}`,
  OVERDUE: (t) => `Overdue: ${t}`,
};

// Records a send before it happens. Returns false if another run already claimed it.
async function claim(key: string, userId: string, type: string): Promise<boolean> {
  try {
    await prisma.notification.create({ data: { userId, key, type } });
    return true;
  } catch (e) {
    // P2002: already claimed by another run. P2003: the user no longer exists, so nothing to send.
    const code = (e as { code?: string }).code;
    if (code === "P2002" || code === "P2003") return false;
    throw e;
  }
}

async function release(key: string): Promise<void> {
  await prisma.notification.deleteMany({ where: { key } });
}

// Sends each due reminder once and records it, so a failed send is retried next run and
// a successful one is never repeated. Mondays also send each manager the overdue list.
export async function sendReminders(
  now: Date,
  mailer: Mailer,
  opts: { skipDigest?: boolean } = {},
): Promise<{ sent: number }> {
  const periods = await prisma.assessmentPeriod.findMany({
    // Only active learners, and only assessments that are still published.
    where: { status: { in: ["OPEN", "OVERDUE"] }, user: { active: true }, assessment: { published: true } },
    include: { user: true, assessment: true },
  });
  const sentKeys = new Set((await prisma.notification.findMany({ select: { key: true } })).map((n) => n.key));
  const due = remindersDue(periods.map((p) => ({ id: p.id, userId: p.userId, dueAt: p.dueAt, status: p.status })), now, sentKeys);
  const byId = new Map(periods.map((p) => [p.id, p]));

  let sent = 0;
  for (const r of due) {
    const p = byId.get(r.periodId);
    if (!p) continue;
    // Claim first: the unique key means two overlapping runs cannot both send.
    const claimed = await claim(r.key, p.userId, r.type);
    if (!claimed) continue;
    try {
      await mailer.send(p.user.email, SUBJECT[r.type](p.assessment.title), `Please complete "${p.assessment.title}" by ${p.dueAt.toISOString().slice(0, 10)}.`);
    } catch (e) {
      // Release the claim, so the next run retries it. The rest of this run still goes out.
      await release(r.key);
      console.error("reminder send failed", r.key, (e as Error).message);
      continue;
    }
    sent++;
  }

  sent += await sendCourseReminders(now, mailer, sentKeys);

  if (!opts.skipDigest && now.getUTCDay() === 1) {
    const week = periodKeyFor("WEEKLY", now);
    const since = new Date(now.getTime() - 28 * 24 * 3600_000);
    const overdue = await prisma.assessmentPeriod.findMany({
      where: { status: "OVERDUE", dueAt: { gte: since }, user: { active: true }, assessment: { published: true } },
      include: { user: { select: { id: true, name: true, managerId: true } }, assessment: { select: { title: true } } },
    });
    const users = await prisma.user.findMany({ select: { id: true, managerId: true, email: true } });
    const emailOf = new Map(users.map((u) => [u.id, u.email]));
    const names = new Map(overdue.map((p) => [p.userId, p.user.name]));
    const digest = overdueByManager(
      overdue.map((p) => ({ userId: p.userId, status: p.status, title: `${p.assessment.title} (due ${p.dueAt.toISOString().slice(0, 10)})` })),
      users,
    );
    for (const [managerId, items] of digest) {
      const key = `digest:${managerId}:${week}`;
      if (sentKeys.has(key)) continue;
      const to = emailOf.get(managerId);
      if (!to) continue;
      const list = items.map((i) => `- ${names.get(i.userId) ?? "A team member"}: ${i.title}`).join("\n");
      if (!(await claim(key, managerId, "DIGEST"))) continue;
      try {
        await mailer.send(to, "Your team's overdue assessments", `These team members have overdue assessments (last four weeks):\n${list}`);
      } catch (e) {
        await release(key);
        console.error("digest send failed", managerId, (e as Error).message);
        continue;
      }
      sent++;
    }
  }
  return { sent };
}

const COURSE_SUBJECT: Record<ReminderType, (title: string) => string> = {
  DUE_SOON: (t) => `Course due in a few days: ${t}`,
  DUE_TODAY: (t) => `Course due today: ${t}`,
  OVERDUE: (t) => `Course overdue: ${t}`,
};

// Assigned courses with a due date that the learner has not finished get the same three
// reminders as assessments (3 days before, on the day, overdue), each sent once.
async function sendCourseReminders(now: Date, mailer: Mailer, sentKeys: Set<string>): Promise<number> {
  const assignments = (await allAssignmentRefs()).filter((a) => a.dueAt);
  if (assignments.length === 0) return 0;
  const titles = await prisma.course.findMany({ where: { id: { in: [...new Set(assignments.map((a) => a.courseId))] } }, select: { id: true, title: true } });
  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, email: true, department: true, jobTitle: true } });
  const assigned = resolveAssignments(users, assignments);
  const done = new Set((await prisma.courseProgress.findMany({ where: { completedAt: { not: null } }, select: { userId: true, courseId: true } })).map((p) => `${p.userId}|${p.courseId}`));
  const open = assigned.filter((a) => a.dueAt && !done.has(`${a.userId}|${a.courseId}`));
  const due = remindersDue(open.map((a) => ({ id: `course:${a.userId}:${a.courseId}`, userId: a.userId, dueAt: a.dueAt as Date, status: "OPEN" as const })), now, sentKeys);
  const email = new Map(users.map((u) => [u.id, u.email]));
  const title = new Map(titles.map((c) => [c.id, c.title]));
  const dueAt = new Map(open.map((a) => [`course:${a.userId}:${a.courseId}`, a.dueAt as Date]));
  let sent = 0;
  for (const r of due) {
    const courseId = r.periodId.split(":")[2];
    const to = email.get(r.userId);
    if (!to || !(await claim(r.key, r.userId, `COURSE_${r.type}`))) continue;
    const name = title.get(courseId) ?? "your course";
    try {
      await mailer.send(to, COURSE_SUBJECT[r.type](name), `Please finish the course "${name}" by ${dueAt.get(r.periodId)?.toISOString().slice(0, 10)}.`);
    } catch (e) {
      await release(r.key);
      console.error("course reminder send failed", r.key, (e as Error).message);
      continue;
    }
    sent++;
  }
  return sent;
}
