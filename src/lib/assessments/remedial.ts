import { prisma } from "../db/client";
import { AuthError } from "../auth/guards";
import { canViewUser } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { recordAudit } from "../audit/record";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// The retake opens after the delay, but never later than the period's due time, so the
// delay can not make a retake impossible within the period.
export function retakeTime(now: Date, delayHours: number, dueAt: Date): Date {
  const after = new Date(now.getTime() + Math.max(0, delayHours) * 3600_000);
  return after.getTime() > dueAt.getTime() ? dueAt : after;
}

// Server-side messages use the company time zone (TZ, default India Standard Time).
export function formatWhen(d: Date, timeZone: string = process.env.TZ || "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone }).format(d);
}

// Called inside the transaction that records a failed result. The linked course (if it is
// published) is set to be worked through again, and a plan records when the retake opens.
export async function openRemedial(
  tx: Tx,
  input: { userId: string; actorId: string; attemptId: string; periodId: string; now: Date;
    assessment: { id: string; courseId: string | null; retakeDelayHours: number } },
): Promise<void> {
  const period = await tx.assessmentPeriod.findUniqueOrThrow({ where: { id: input.periodId }, select: { dueAt: true } });
  const course = input.assessment.courseId
    ? await tx.course.findUnique({ where: { id: input.assessment.courseId }, select: { id: true, status: true } })
    : null;
  const courseId = course?.status === "PUBLISHED" ? course.id : null;

  // One open plan per learner and assessment; a new fail replaces the old one.
  await tx.remedialPlan.updateMany({
    where: { userId: input.userId, assessmentId: input.assessment.id, status: "OPEN" },
    data: { status: "DONE", closedAt: input.now },
  });
  const plan = await tx.remedialPlan.create({
    data: {
      userId: input.userId,
      assessmentId: input.assessment.id,
      courseId,
      attemptId: input.attemptId,
      retakeAfter: retakeTime(input.now, input.assessment.retakeDelayHours, period.dueAt),
    },
  });
  if (courseId) {
    // Lessons are assigned again: course completion is cleared. Video positions and lab
    // ticks are kept, so the learner can move quickly through what they already know.
    await tx.courseProgress.updateMany({
      where: { userId: input.userId, courseId },
      data: { completedLessonIds: [], completedAt: null },
    });
  }
  await recordAudit(tx, {
    actorId: input.actorId, action: "remedial.open", entityType: "RemedialPlan", entityId: plan.id,
    after: { userId: input.userId, assessmentId: input.assessment.id, courseId, retakeAfter: plan.retakeAfter.toISOString() },
  });
}

// Why the learner cannot retake yet, or null if they can. Starting a retake with both
// conditions met closes the plan.
export async function remedialBlock(userId: string, assessmentId: string, now: Date): Promise<string | null> {
  const plan = await prisma.remedialPlan.findFirst({
    where: { userId, assessmentId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return null;
  if (plan.courseId) {
    const progress = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId, courseId: plan.courseId } },
      include: { course: { select: { title: true, status: true } } },
    });
    const course = progress?.course ?? (await prisma.course.findUnique({ where: { id: plan.courseId }, select: { title: true, status: true } }));
    // A course retired after the plan was made no longer blocks the retake.
    if (course?.status === "PUBLISHED" && !progress?.completedAt) {
      return `Before your retake, work through the course "${course.title}" again.`;
    }
  }
  if (now.getTime() < plan.retakeAfter.getTime()) {
    return `Your retake opens on ${formatWhen(plan.retakeAfter)}.`;
  }
  await prisma.remedialPlan.update({ where: { id: plan.id }, data: { status: "DONE", closedAt: now } });
  return null;
}

export async function openRemedialsFor(userId: string) {
  const plans = await prisma.remedialPlan.findMany({
    where: { userId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { assessment: { select: { title: true } } },
  });
  const courseIds = plans.map((p) => p.courseId).filter((x): x is string => x !== null);
  const [courses, progress] = await Promise.all([
    prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }),
    prisma.courseProgress.findMany({ where: { userId, courseId: { in: courseIds } }, select: { courseId: true, completedAt: true } }),
  ]);
  const titles = new Map(courses.map((c) => [c.id, c.title]));
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.courseId));
  return plans.map((p) => ({
    id: p.id,
    assessment: p.assessment.title,
    courseId: p.courseId,
    courseTitle: p.courseId ? titles.get(p.courseId) ?? null : null,
    courseDone: p.courseId ? done.has(p.courseId) : true,
    retakeAfter: p.retakeAfter,
    managerComment: p.managerComment,
    createdAt: p.createdAt,
  }));
}

// A manager comments on (or approves) a remedial plan of someone in their reporting line.
export async function commentOnRemedial(actor: SessionUser, planId: string, comment: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (actor.role !== "MANAGER" && actor.role !== "ADMIN") throw new AuthError(403);
  const plan = await prisma.remedialPlan.findUnique({ where: { id: planId } });
  if (!plan) return { ok: false, error: "Plan not found" };
  if (plan.userId === actor.id) return { ok: false, error: "You cannot comment on your own plan" };
  if (actor.role === "MANAGER") {
    const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
    if (!canViewUser(actor, plan.userId, all)) throw new AuthError(403);
  }
  const text = comment.trim().slice(0, 1000);
  if (!text) return { ok: false, error: "Write a comment" };
  await prisma.$transaction(async (tx) => {
    await tx.remedialPlan.update({ where: { id: planId }, data: { managerComment: text } });
    await recordAudit(tx, { actorId: actor.id, action: "remedial.comment", entityType: "RemedialPlan", entityId: planId, before: { managerComment: plan.managerComment }, after: { managerComment: text } });
  });
  return { ok: true };
}
