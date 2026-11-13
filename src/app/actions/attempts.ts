"use server";

import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { startAttempt, submitAttempt, presentedQuestionIds } from "../../lib/assessments/take";
import { recordProctorEvent } from "../../lib/assessments/proctor";

export async function startAttemptAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const periodId = String(formData.get("periodId") ?? "");
  let attemptId: string;
  try {
    ({ attemptId } = await startAttempt(actor, periodId));
  } catch (e) {
    redirect(`/learn/assessments?error=${encodeURIComponent((e as Error).message)}`);
  }
  redirect(`/learn/attempts/${attemptId}`);
}

export async function submitAttemptAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const attemptId = String(formData.get("attemptId") ?? "");
  const ids = await presentedQuestionIds(attemptId);
  const answers: Record<string, string[]> = {};
  for (const id of ids) answers[id] = formData.getAll(`q-${id}`).map(String);
  const result = await submitAttempt(actor, attemptId, answers);
  if (!result.ok) redirect(`/learn/attempts/${attemptId}?error=${encodeURIComponent(result.error)}`);
  redirect(`/learn/attempts/${attemptId}`);
}

// Called from the browser during a proctored attempt.
export async function recordProctorEventAction(attemptId: string, type: string): Promise<{ count: number; limit: number; mustSubmit: boolean }> {
  const actor = await requireSession();
  const r = await recordProctorEvent(actor, attemptId, type);
  return { count: r.count, limit: r.limit, mustSubmit: r.mustSubmit };
}
