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

  completed.add(lessonId);
  const allDone = lessons.every((l) => completed.has(l.id));
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

// Stores where a video stopped, and which lesson the learner was on.
export async function saveLessonPosition(actor: SessionUser, lessonId: string, seconds: number): Promise<void> {
  if (seconds < 0) throw new Error("position cannot be negative");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new Error("lesson not found");
  await prisma.$transaction([
    prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: actor.id, lessonId } },
      create: { userId: actor.id, lessonId, positionSeconds: Math.floor(seconds) },
      update: { positionSeconds: Math.floor(seconds) },
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
