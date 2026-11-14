import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { periodBounds, periodKeyFor } from "../assessments/periods";

// The end-of-course assessment (a published ONE_TIME assessment linked to the course).
// Learners open it themselves from the course page once every lesson is done; no admin
// assignment is needed.
async function checkAssessment(courseId: string) {
  return prisma.assessment.findFirst({
    where: { courseId, cadence: "ONE_TIME", published: true },
    orderBy: { title: "asc" },
    select: { id: true, title: true, passMarkPercent: true, maxAttemptsPerPeriod: true },
  });
}

async function lessonsDone(userId: string, courseId: string): Promise<boolean> {
  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({ where: { courseId }, select: { id: true } }),
    prisma.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId } } }),
  ]);
  const done = new Set((progress?.completedLessonIds as string[] | null) ?? []);
  return lessons.length > 0 && lessons.every((l) => done.has(l.id));
}

// What the course page shows about the check for this learner, or null if the course has none.
export async function courseCheckFor(userId: string, courseId: string) {
  const a = await checkAssessment(courseId);
  if (!a) return null;
  const period = await prisma.assessmentPeriod.findUnique({
    where: { assessmentId_userId_periodKey: { assessmentId: a.id, userId, periodKey: periodKeyFor("ONE_TIME", new Date()) } },
    include: { attempts: { where: { status: { not: "VOIDED" } }, orderBy: { startedAt: "desc" } } },
  });
  const attempts = period?.attempts ?? [];
  const best = attempts.filter((x) => x.scorePercent !== null).sort((x, y) => (y.scorePercent ?? 0) - (x.scorePercent ?? 0))[0];
  return {
    title: a.title,
    passMarkPercent: a.passMarkPercent,
    ready: await lessonsDone(userId, courseId),
    passed: period?.status === "PASSED",
    bestScore: best?.scorePercent ?? null,
    awaitingGrading: attempts.some((x) => x.status === "AWAITING_GRADING"),
    inProgressAttemptId: attempts.find((x) => x.status === "IN_PROGRESS")?.id ?? null,
    attemptsUsed: attempts.length,
    attemptsAllowed: a.maxAttemptsPerPeriod,
  };
}

// Opens (or finds) the learner's period for the course's check and returns its id. Refused
// until every lesson is done, and for courses that are not published.
export async function openCourseCheck(actor: SessionUser, courseId: string): Promise<{ ok: true; periodId: string } | { ok: false; error: string }> {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { status: true } });
  if (!course || course.status !== "PUBLISHED") return { ok: false, error: "This course is not available" };
  const a = await checkAssessment(courseId);
  if (!a) return { ok: false, error: "This course has no completion check" };
  if (!(await lessonsDone(actor.id, courseId))) return { ok: false, error: "Finish every lesson before taking the completion check" };
  const periodKey = periodKeyFor("ONE_TIME", new Date());
  const { opensAt, dueAt } = periodBounds("ONE_TIME", periodKey);
  const period = await prisma.assessmentPeriod.upsert({
    where: { assessmentId_userId_periodKey: { assessmentId: a.id, userId: actor.id, periodKey } },
    update: {},
    create: { assessmentId: a.id, userId: actor.id, periodKey, opensAt, dueAt, status: "OPEN" },
  });
  return { ok: true, periodId: period.id };
}
