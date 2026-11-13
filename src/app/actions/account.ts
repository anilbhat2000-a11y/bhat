"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { changeOwnPassword, setUserPassword, updateSubject } from "../../lib/admin/users";
import { deleteCourse, updateCourse } from "../../lib/learning/courses";
import type { Category, Level } from "../../generated/prisma/client";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

export async function changePasswordAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await changeOwnPassword(actor, text(formData, "current"), text(formData, "next"));
  if (!result.ok) redirect(`/learn/profile?error=${encodeURIComponent(result.error)}`);
  redirect("/learn/profile?notice=Password%20changed");
}

export async function setUserPasswordAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const result = await setUserPassword(actor, id, text(formData, "next"));
  if (!result.ok) redirect(`/admin/users/${id}?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}?notice=${encodeURIComponent("Password reset; the user must sign in again")}`);
}

export async function updateSubjectAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const result = await updateSubject(actor, id, {
    name: text(formData, "name"),
    category: text(formData, "category") as Category,
    certificationValidityMonths: Number(text(formData, "certificationValidityMonths") || 12),
  });
  if (!result.ok) redirect(`/admin/subjects?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/subjects");
  redirect("/admin/subjects?notice=Subject%20saved");
}

export async function updateCourseAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const result = await updateCourse(actor, id, {
    title: text(formData, "title"),
    description: text(formData, "description"),
    level: text(formData, "level") as Level,
    passMarkPercent: Number(text(formData, "passMarkPercent") || 70),
    minVideoWatchPercent: Number(text(formData, "minVideoWatchPercent") || 0),
    requireAssessmentPass: text(formData, "requireAssessmentPass") === "on",
  });
  if (!result.ok) redirect(`/admin/courses/${id}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/admin/courses/${id}`);
  redirect(`/admin/courses/${id}?notice=Course%20saved`);
}

export async function deleteCourseAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const result = await deleteCourse(actor, id);
  if (!result.ok) redirect(`/admin/courses/${id}?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/courses");
  redirect("/admin/courses?notice=Course%20deleted");
}
