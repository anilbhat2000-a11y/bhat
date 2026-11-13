"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { commentOnRemedial } from "../../lib/assessments/remedial";

export async function commentRemedialAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const userId = String(formData.get("userId") ?? "");
  const to = `/manager/team/${encodeURIComponent(userId)}`;
  const result = await commentOnRemedial(actor, String(formData.get("planId") ?? ""), String(formData.get("comment") ?? ""));
  if (!result.ok) redirect(`${to}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(to);
  redirect(`${to}?notice=${encodeURIComponent("Comment saved")}`);
}
