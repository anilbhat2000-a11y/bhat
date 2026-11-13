import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";

// Share of the course's lessons completed. Ids outside the course are ignored.
export function courseProgressPercent(totalLessons: number, completedLessonIds: string[], lessonIds: string[]): number {
  if (totalLessons === 0) return 0;
  const inCourse = new Set(lessonIds);
  const done = new Set(completedLessonIds.filter((id) => inCourse.has(id))).size;
  return Math.round((done / totalLessons) * 100);
}

type Done = { ok: true } | { ok: false; error: string };

// Playback between two saves counts as watched only when it moved forward by a small step,
// so skipping ahead (or seeking back) adds nothing. Saves happen every 5 seconds, so 15
// seconds allows for double-speed playback.
export const MAX_WATCH_STEP = 15;
export function watchIncrement(previous: number, next: number): number {
  const step = next - previous;
  return step > 0 && step <= MAX_WATCH_STEP ? step : 0;
}

// Whether a video lesson meets the course's minimum watched share.
export function videoRuleMet(minPercent: number, watched: number, duration: number | null): { ok: true } | { ok: false; error: string } {
  if (minPercent <= 0) return { ok: true };
  if (!duration) return { ok: false, error: `Play the video first: at least ${minPercent}% of it must be watched` };
  const percent = Math.floor((Math.min(watched, duration) / duration) * 100);
  return percent >= minPercent ? { ok: true } : { ok: false, error: `Watch at least ${minPercent}% of the video first (you have watched ${percent}%)` };
}

// A course with requireAssessmentPass completes only once one of its linked assessments
// has been passed.
export async function passedCourseAssessment(userId: string, courseId: string): Promise<boolean> {
  return (await prisma.assessmentAttempt.count({
    where: { userId, status: "SUBMITTED", passed: true, period: { assessment: { courseId } } },
  })) > 0;
}

// Lessons must be completed in order. Completing an already completed lesson is accepted.
export async function completeLesson(actor: SessionUser, lessonId: string): Promise<Done> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { type: true } });
  // A live session completes when attendance is recorded, not when the learner presses a button.
  if (lesson?.type === "LIVE_SESSION") {
    return { ok: false, error: "This lesson is completed when your attendance is recorded" };
  }
  return completeLessonForUser(actor.id, lessonId);
}

// Same rules, for a user id. Used when a manager or admin records attendance.
export async function completeLessonForUser(userId: string, lessonId: string): Promise<Done> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson || lesson.course.status !== "PUBLISHED") return { ok: false, error: "This lesson is not available" };

  const lessons = await prisma.lesson.findMany({ where: { courseId: lesson.courseId }, orderBy: { position: "asc" } });
  const existing = await prisma.courseProgress.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
  });
  const completed = new Set<string>((existing?.completedLessonIds as string[] | undefined) ?? []);
  if (completed.has(lessonId)) return { ok: true };

  const next = lessons.find((l) => !completed.has(l.id));
  if (!next || next.id !== lessonId) return { ok: false, error: "Complete the earlier lessons first" };

  if (lesson.type === "VIDEO") {
    const watched = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
    const rule = videoRuleMet(lesson.course.minVideoWatchPercent, watched?.watchedSeconds ?? 0, watched?.durationSeconds ?? null);
    if (!rule.ok) return rule;
  }

  completed.add(lessonId);
  const lessonsDone = lessons.every((l) => completed.has(l.id));
  const allDone = lessonsDone && (!lesson.course.requireAssessmentPass || (await passedCourseAssessment(userId, lesson.courseId)));
  await prisma.$transaction([
    prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, completed: true },
      update: { completed: true },
    }),
    prisma.courseProgress.upsert({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
      create: {
        userId,
        courseId: lesson.courseId,
        completedLessonIds: [...completed],
        completedAt: allDone ? new Date() : null,
      },
      update: {
        completedLessonIds: [...completed],
        completedAt: allDone ? new Date() : null,
      },
    }),
  ]);
  // An attended live session that now comes next completes on its own (attendance can be
  // recorded before the earlier lessons are done).
  await completeAttendedLive(userId, lesson.courseId);
  return { ok: true };
}

async function completeAttendedLive(userId: string, courseId: string): Promise<void> {
  for (;;) {
    const lessons = await prisma.lesson.findMany({ where: { courseId }, orderBy: { position: "asc" } });
    const row = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId } } });
    const done = new Set<string>((row?.completedLessonIds as string[] | undefined) ?? []);
    const nextLesson = lessons.find((l) => !done.has(l.id));
    if (!nextLesson || nextLesson.type !== "LIVE_SESSION") return;
    const attended = await prisma.liveSessionRegistration.findFirst({
      where: { userId, attended: true, liveSession: { lessonId: nextLesson.id } },
    });
    if (!attended) return;
    const result = await completeLessonForUser(userId, nextLesson.id);
    if (!result.ok) return;
  }
}

// Stores where a video stopped, how much of it has been played, and which lesson the
// learner was on. `duration` is the video length reported by the player.
export async function saveLessonPosition(actor: SessionUser, lessonId: string, seconds: number, duration?: number): Promise<void> {
  if (!(seconds >= 0)) throw new Error("position cannot be negative");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new Error("lesson not found");
  const position = Math.floor(seconds);
  const length = duration !== undefined && Number.isFinite(duration) && duration > 0 && duration < 86_400 ? Math.ceil(duration) : undefined;
  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: actor.id, lessonId } } });
  const cap = length ?? existing?.durationSeconds ?? Number.MAX_SAFE_INTEGER;
  const watched = Math.min(cap, (existing?.watchedSeconds ?? 0) + watchIncrement(existing?.positionSeconds ?? 0, position));
  await prisma.$transaction([
    prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: actor.id, lessonId } },
      create: { userId: actor.id, lessonId, positionSeconds: position, watchedSeconds: watched, durationSeconds: length },
      update: { positionSeconds: position, watchedSeconds: watched, ...(length ? { durationSeconds: length } : {}) },
    }),
    prisma.courseProgress.upsert({
      where: { userId_courseId: { userId: actor.id, courseId: lesson.courseId } },
      create: { userId: actor.id, courseId: lesson.courseId, lastLessonId: lessonId },
      update: { lastLessonId: lessonId },
    }),
  ]);
}

export async function lastLessonFor(userId: string, courseId: string): Promise<string | null> {
  const row = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId } } });
  return row?.lastLessonId ?? null;
}

// Published courses only, grouped by category, each with the learner's progress.
export async function listCatalogue(user: SessionUser) {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: { subject: true, lessons: { select: { id: true } }, progress: { where: { userId: user.id } } },
    orderBy: [{ subject: { name: "asc" } }, { title: "asc" }],
  });
  const groups = (["BUSINESS", "TECHNICAL"] as const).map((category) => ({
    category,
    courses: courses
      .filter((c) => c.subject.category === category)
      .map((c) => {
        const completed = (c.progress[0]?.completedLessonIds as string[] | undefined) ?? [];
        const lessonIds = c.lessons.map((l) => l.id);
        return {
          id: c.id,
          title: c.title,
          level: c.level,
          subject: c.subject.name,
          progress: courseProgressPercent(lessonIds.length, completed, lessonIds),
        };
      }),
  }));
  return groups;
}
