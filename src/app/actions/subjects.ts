"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { createSubject } from "../../lib/admin/users";
import type { Category } from "../../generated/prisma/client";

export async function createSubjectAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await createSubject(actor, {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? "") as Category,
    certificationValidityMonths: Number(formData.get("certificationValidityMonths") ?? 12),
  });
  if (!result.ok) redirect(`/admin/subjects?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/subjects");
  redirect("/admin/subjects?notice=Subject+created");
}
