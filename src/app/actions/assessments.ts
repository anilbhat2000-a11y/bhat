"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { parseCsvRows } from "../../lib/import/csv";
import type { QuestionRow } from "../../lib/import/questions";
import {
  createAssessment, addQuestion, importQuestions, setAssessmentPublished, setAssignments, resetAttempts,
} from "../../lib/assessments/admin";
import { prisma } from "../../lib/db/client";
import { openPeriodsFor } from "../../lib/assessments/open-periods";
import type { Cadence, Level } from "../../generated/prisma/client";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const optionalInt = (fd: FormData, key: string) => (text(fd, key).trim() === "" ? null : Number(text(fd, key)));

function back(to: string, message: string, kind: "error" | "notice"): never {
  redirect(`${to}?${kind}=${encodeURIComponent(message)}`);
}

export async function createAssessmentAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await createAssessment(actor, {
    subjectId: text(formData, "subjectId"),
    title: text(formData, "title"),
    cadence: text(formData, "cadence") as Cadence,
    level: text(formData, "level") as Level,
    passMarkPercent: Number(text(formData, "passMarkPercent") || 70),
    timeLimitMinutes: optionalInt(formData, "timeLimitMinutes"),
    maxAttemptsPerPeriod: Number(text(formData, "maxAttemptsPerPeriod") || 3),
    questionsPerAttempt: optionalInt(formData, "questionsPerAttempt"),
    showAnswersAfterSubmit: text(formData, "showAnswersAfterSubmit") === "on",
  });
  if (!result.ok) back("/admin/assessments", result.error, "error");
  revalidatePath("/admin/assessments");
  redirect(`/admin/assessments/${result.id}`);
}

export async function addQuestionAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const assessmentId = text(formData, "assessmentId");
  const to = `/admin/assessments/${assessmentId}`;
  const row: QuestionRow = {
    type: text(formData, "type") || "SINGLE",
    text: text(formData, "text"),
    options: text(formData, "options"),
    correct: text(formData, "correct"),
    points: text(formData, "points") || "1",
  };
  const result = await addQuestion(actor, assessmentId, row);
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "Question added", "notice");
}

// CSV columns: type, text, options (|-separated), correct (option numbers, |-separated), points.
export async function importQuestionsAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const assessmentId = text(formData, "assessmentId");
  const to = `/admin/assessments/${assessmentId}`;
  const rows: QuestionRow[] = parseCsvRows(text(formData, "csv")).map((r) => ({
    type: r.type ?? "",
    text: r.text ?? "",
    options: r.options ?? "",
    correct: r.correct ?? "",
    points: r.points ?? "1",
  }));
  const result = await importQuestions(actor, assessmentId, rows);
  if (!result.ok) {
    const first = result.errors[0];
    back(to, `Row ${first.row}: ${first.reason}. Nothing was imported.`, "error");
  }
  revalidatePath(to);
  back(to, `Imported ${result.created} questions`, "notice");
}

export async function setPublishedAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "assessmentId");
  const to = `/admin/assessments/${id}`;
  const published = text(formData, "published") === "true";
  const result = await setAssessmentPublished(actor, id, published);
  if (!result.ok) back(to, result.error, "error");
  if (published) await openPeriodsFor(id, new Date());
  revalidatePath(to);
  back(to, "Status updated", "notice");
}

export async function setAssignmentAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "assessmentId");
  const to = `/admin/assessments/${id}`;
  const targetType = text(formData, "targetType") as "ALL" | "DEPARTMENT" | "USER";
  const targetValue = targetType === "ALL" ? null : text(formData, "targetValue").trim() || null;
  const result = await setAssignments(actor, id, [{ targetType, targetValue }]);
  if (!result.ok) back(to, result.error, "error");
  await openPeriodsFor(id, new Date());
  revalidatePath(to);
  back(to, "Assignment saved", "notice");
}

export async function resetAttemptsAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const periodId = text(formData, "periodId");
  const period = await prisma.assessmentPeriod.findUnique({ where: { id: periodId }, select: { assessmentId: true } });
  const to = `/admin/assessments/${period?.assessmentId ?? ""}`;
  const result = await resetAttempts(actor, periodId);
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "Attempts reset", "notice");
}
