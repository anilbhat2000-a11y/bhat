import { prisma } from "../db/client";
import { periodBounds, periodKeyFor } from "./periods";

// Opens the current period for every user the assessment is assigned to, then marks
// open periods past their due time as OVERDUE. Idempotent: the unique key prevents
// duplicates. Earlier periods are never back-filled, and PASSED periods never change.
export async function openPeriodsFor(assessmentId: string, now: Date = new Date()): Promise<{ created: number }> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { assignments: true },
  });
  if (!assessment || !assessment.published) return { created: 0 };

  const userIds = await assignedUserIds(assessment.assignments);
  const periodKey = periodKeyFor(assessment.cadence, now);
  const { opensAt, dueAt } = periodBounds(assessment.cadence, periodKey);

  const created = userIds.length === 0 ? { count: 0 } : await prisma.assessmentPeriod.createMany({
    data: userIds.map((userId) => ({ assessmentId, userId, periodKey, opensAt, dueAt, status: "OPEN" as const })),
    skipDuplicates: true,
  });

  await prisma.assessmentPeriod.updateMany({
    where: { assessmentId, status: "OPEN", dueAt: { lt: now } },
    data: { status: "OVERDUE" },
  });

  return { created: created.count };
}

export async function assignedUserIds(
  assignments: { targetType: "ALL" | "DEPARTMENT" | "USER"; targetValue: string | null }[],
): Promise<string[]> {
  const ids = new Set<string>();
  for (const a of assignments) {
    const users =
      a.targetType === "ALL"
        ? await prisma.user.findMany({ where: { active: true }, select: { id: true } })
        : a.targetType === "DEPARTMENT"
          ? await prisma.user.findMany({ where: { active: true, department: a.targetValue ?? "" }, select: { id: true } })
          : await prisma.user.findMany({ where: { active: true, id: a.targetValue ?? "" }, select: { id: true } });
    for (const u of users) ids.add(u.id);
  }
  return [...ids];
}

// Scheduled: opens the current period for every published assessment, and marks past-due
// periods OVERDUE. Without this, recurring assessments would never roll over.
export async function openAllPeriods(now: Date = new Date()): Promise<{ created: number; failed: number }> {
  const published = await prisma.assessment.findMany({ where: { published: true }, select: { id: true } });
  let created = 0;
  let failed = 0;
  for (const a of published) {
    // One assessment that fails must not stop the others; the next run retries it.
    try {
      created += (await openPeriodsFor(a.id, now)).created;
    } catch (e) {
      failed++;
      console.error("could not open periods for", a.id, (e as Error).message);
    }
  }
  return { created, failed };
}
