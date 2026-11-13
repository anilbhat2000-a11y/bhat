"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { gradeAttempt, type Mark } from "../../lib/assessments/grading";

// Form fields: attemptId, reviewerNote, and per short answer points-<questionId> and
// note-<questionId>.
export async function gradeAttemptAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const attemptId = String(formData.get("attemptId") ?? "");
  const marks: Record<string, Mark> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("points-")) continue;
    const id = key.slice("points-".length);
    const raw = String(value).trim();
    marks[id] = { points: raw === "" ? Number.NaN : Number(raw), note: String(formData.get(`note-${id}`) ?? "") };
  }
  const result = await gradeAttempt(actor, attemptId, marks, String(formData.get("reviewerNote") ?? ""));
  if (!result.ok) redirect(`/admin/grading/${attemptId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/grading");
  redirect(`/admin/grading?notice=${encodeURIComponent(`Graded: ${result.scorePercent}%, ${result.passed ? "passed" : "not passed"}`)}`);
}
