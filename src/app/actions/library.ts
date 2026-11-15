"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { cleanTags, deleteLibraryItem, updateLibraryItem, useInCourse } from "../../lib/library/library";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const go = (to: string, message: string, kind: "notice" | "error"): never => redirect(`${to}?${kind}=${encodeURIComponent(message)}`);

export async function updateLibraryItemAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(fd, "id");
  const r = await updateLibraryItem(actor, id, { title: text(fd, "title"), description: text(fd, "description"), tags: cleanTags(text(fd, "tags")) });
  if (!r.ok) go(`/admin/library/${id}`, r.error, "error");
  revalidatePath("/admin/library");
  go(`/admin/library/${id}`, "Details saved", "notice");
}

export async function deleteLibraryItemAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(fd, "id");
  const r = await deleteLibraryItem(actor, id);
  if (!r.ok) go(`/admin/library/${id}`, r.error, "error");
  revalidatePath("/admin/library");
  go("/admin/library", "File deleted from the library", "notice");
}

export async function useInCourseAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(fd, "id");
  const courseId = text(fd, "courseId");
  const r = await useInCourse(actor, id, { courseId, title: text(fd, "title") });
  if (!r.ok) go(`/admin/library/${id}`, r.error, "error");
  revalidatePath(`/admin/courses/${courseId}`);
  go(`/admin/courses/${courseId}`, "Lesson added from the content library", "notice");
}
