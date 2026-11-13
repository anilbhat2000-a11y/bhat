"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { prisma } from "../../lib/db/client";
import { saveLabProgress } from "../../lib/learning/labs";

export async function saveLabAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const lessonId = String(formData.get("lessonId") ?? "");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  const to = `/learn/courses/${lesson?.courseId ?? ""}`;
  const result = await saveLabProgress(lessonId, actor.id, formData.getAll("item").map(String));
  if (result.error) redirect(`${to}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(to);
  redirect(to);
}
