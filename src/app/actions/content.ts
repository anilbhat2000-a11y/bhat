"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { prisma } from "../../lib/db/client";
import { deleteLesson } from "../../lib/learning/courses";
import { deleteQuestion, updateAssessmentSettings } from "../../lib/assessments/admin";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const optional = (fd: FormData, key: string) => (text(fd, key).trim() === "" ? null : Number(text(fd, key)));

export async function deleteLessonAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "lessonId");
  const lesson = await prisma.lesson.findUnique({ where: { id }, select: { courseId: true } });
  const to = `/admin/courses/${lesson?.courseId ?? ""}`;
  const result = await deleteLesson(actor, id);
  if (!result.ok) redirect(`${to}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(to);
  redirect(`${to}?notice=${encodeURIComponent("Lesson deleted")}`);
}

export async function deleteQuestionAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "questionId");
  const question = await prisma.question.findUnique({ where: { id }, select: { assessmentId: true } });
  const to = `/admin/assessments/${question?.assessmentId ?? ""}`;
  const result = await deleteQuestion(actor, id);
  if (!result.ok) redirect(`${to}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(to);
  redirect(`${to}?notice=${encodeURIComponent("Question deleted")}`);
}

export async function updateSettingsAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "assessmentId");
  const to = `/admin/assessments/${id}`;
  const result = await updateAssessmentSettings(actor, id, {
    passMarkPercent: Number(text(formData, "passMarkPercent") || 70),
    showAnswersAfterSubmit: text(formData, "showAnswersAfterSubmit") === "on",
    maxAttemptsPerPeriod: Number(text(formData, "maxAttemptsPerPeriod") || 3),
    timeLimitMinutes: optional(formData, "timeLimitMinutes"),
    questionsPerAttempt: optional(formData, "questionsPerAttempt"),
  });
  if (!result.ok) redirect(`${to}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(to);
  redirect(`${to}?notice=${encodeURIComponent("Settings saved")}`);
}
