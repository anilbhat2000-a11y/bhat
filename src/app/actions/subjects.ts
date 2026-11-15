"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { createSubject, deleteSubject, updateSubject } from "../../lib/admin/users";
import type { Category } from "../../generated/prisma/client";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const done = (message: string, kind: "notice" | "error", extra = ""): never =>
  redirect(`/admin/subjects?${kind}=${encodeURIComponent(message)}${extra}`);

export async function createSubjectAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const name = text(formData, "name").trim();
  const result = await createSubject(actor, {
    name,
    category: text(formData, "category") as Category,
    certificationValidityMonths: Number(text(formData, "certificationValidityMonths") || 12),
  });
  if (!result.ok) done(result.error, "error", "#add");
  revalidatePath("/admin/subjects");
  done(`Subject "${name}" added`, "notice");
}

export async function saveSubjectAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const name = text(formData, "name").trim();
  const result = await updateSubject(actor, id, {
    name,
    category: text(formData, "category") as Category,
    certificationValidityMonths: Number(text(formData, "certificationValidityMonths") || 12),
  });
  if (!result.ok) done(result.error, "error", `&edit=${encodeURIComponent(id)}`);
  revalidatePath("/admin/subjects");
  done(`Subject "${name}" saved`, "notice");
}

export async function deleteSubjectAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await deleteSubject(actor, text(formData, "id"));
  if (!result.ok) done(result.error, "error");
  revalidatePath("/admin/subjects");
  done("Subject deleted", "notice");
}
