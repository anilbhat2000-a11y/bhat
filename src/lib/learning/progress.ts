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
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson || lesson.course.status !== "PUBLISHED") return { ok: false, error: "This lesson is not available" };

  const lessons = await prisma.lesson.findMany({ where: { courseId: lesson.courseId }, orderBy: { position: "asc" } });
  const existing = await prisma.courseProgress.findUnique({
    where: { userId_courseId: { userId: actor.id, courseId: lesson.courseId } },
  });
  const completed = new Set<string>((existing?.completedLessonIds as string[] | undefined) ?? []);
  if (completed.has(lessonId)) return { ok: true };

  const next = lessons.find((l) => !completed.has(l.id));
  if (!next || next.id !== lessonId) return { ok: false, error: "Complete the earlier lessons first" };

  completed.add(lessonId);
  const allDone = lessons.every((l) => completed.has(l.id));
  await prisma.$transaction([
    prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: actor.id, lessonId } },
      create: { userId: actor.id, lessonId, completed: true },
      update: { completed: true },
    }),
    prisma.courseProgress.upsert({
      where: { userId_courseId: { userId: actor.id, courseId: lesson.courseId } },
      create: {
        userId: actor.id,
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
  return { ok: true };
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
