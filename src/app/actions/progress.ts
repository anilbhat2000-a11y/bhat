"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { prisma } from "../../lib/db/client";
import { completeLesson, saveLessonPosition } from "../../lib/learning/progress";

export async function completeLessonAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const lessonId = String(formData.get("lessonId") ?? "");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  const to = `/learn/courses/${lesson?.courseId ?? ""}`;
  const result = await completeLesson(actor, lessonId);
  if (!result.ok) redirect(`${to}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(to);
  redirect(to);
}

// Called from the video player every few seconds.
export async function savePositionAction(lessonId: string, seconds: number, duration?: number): Promise<void> {
  const actor = await requireSession();
  await saveLessonPosition(actor, lessonId, seconds, duration);
}
