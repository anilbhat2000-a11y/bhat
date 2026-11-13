"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { createCourse, addLesson, setCoursePublished, reorderLessons, attachCaption } from "../../lib/learning/courses";
import { prisma } from "../../lib/db/client";
import { addModule, assignLessonModules, deleteModule, setCourseArchived } from "../../lib/learning/modules";
import type { Level } from "../../generated/prisma/client";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

function back(to: string, message: string, kind: "error" | "notice"): never {
  redirect(`${to}?${kind}=${encodeURIComponent(message)}`);
}

export async function createCourseAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await createCourse(actor, {
    subjectId: text(formData, "subjectId"),
    title: text(formData, "title"),
    description: text(formData, "description"),
    level: text(formData, "level") as Level,
    passMarkPercent: Number(text(formData, "passMarkPercent") || 70),
  });
  if (!result.ok) back("/admin/courses", result.error, "error");
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${result.id}`);
}

export async function addLessonAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const requested = text(formData, "type");
  const type = (["TEXT", "LINK", "LAB", "LIVE_SESSION"].includes(requested) ? requested : "TEXT") as "TEXT" | "LINK" | "LAB" | "LIVE_SESSION";
  const result = await addLesson(actor, courseId, {
    title: text(formData, "title"),
    type,
    body: text(formData, "body"),
    url: text(formData, "url"),
  });
  const to = `/admin/courses/${courseId}`;
  if (!result.ok) back(to, result.error, "error");
  const moduleId = text(formData, "moduleId");
  if (moduleId && result.id) {
    const placed = await assignLessonModules(actor, courseId, { [result.id]: moduleId });
    if (!placed.ok) back(to, `Lesson added, but not placed in the module: ${placed.error}`, "error");
  }
  revalidatePath(to);
  back(to, "Lesson added", "notice");
}

export async function addModuleAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const to = `/admin/courses/${courseId}`;
  const minutes = text(formData, "estimatedMinutes").trim();
  const result = await addModule(actor, courseId, {
    title: text(formData, "title"),
    estimatedMinutes: minutes ? Number(minutes) : null,
  });
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "Module added", "notice");
}

export async function deleteModuleAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const to = `/admin/courses/${courseId}`;
  const result = await deleteModule(actor, text(formData, "moduleId"));
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "Module removed. Its lessons are kept without a module.", "notice");
}

// One select per lesson, named module-<lessonId>.
export async function assignModulesAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const to = `/admin/courses/${courseId}`;
  const assignment: Record<string, string | null> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("module-")) assignment[key.slice("module-".length)] = String(value) || null;
  }
  const result = await assignLessonModules(actor, courseId, assignment);
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "Lessons grouped into modules", "notice");
}

export async function setArchivedAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const to = `/admin/courses/${courseId}`;
  const archived = text(formData, "archived") === "true";
  const result = await setCourseArchived(actor, courseId, archived);
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  revalidatePath("/admin/courses");
  back(to, archived ? "Course archived" : "Course restored to draft", "notice");
}

export async function setPublishedAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const to = `/admin/courses/${courseId}`;
  const result = await setCoursePublished(actor, courseId, text(formData, "published") === "true");
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "Status updated", "notice");
}

// Moves one lesson up or down by swapping it with its neighbour.
export async function moveLessonAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const lessonId = text(formData, "lessonId");
  const direction = text(formData, "direction") === "up" ? -1 : 1;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  const to = `/admin/courses/${lesson?.courseId ?? ""}`;
  if (!lesson) back("/admin/courses", "Lesson not found", "error");
  const lessons = await prisma.lesson.findMany({ where: { courseId: lesson.courseId }, orderBy: { position: "asc" } });
  const index = lessons.findIndex((l) => l.id === lessonId);
  const target = index + direction;
  if (target < 0 || target >= lessons.length) back(to, "Already at the edge", "notice");
  const ids = lessons.map((l) => l.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  const result = await reorderLessons(actor, lesson.courseId, ids);
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "Order updated", "notice");
}

export async function attachCaptionAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const lessonId = text(formData, "lessonId");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  const to = `/admin/courses/${lesson?.courseId ?? ""}`;
  const file = formData.get("captions");
  if (!(file instanceof File) || file.size === 0) back(to, "Choose a .vtt caption file", "error");
  const result = await attachCaption(actor, lessonId, {
    filename: (file as File).name,
    mime: (file as File).type || "text/vtt",
    sizeBytes: (file as File).size,
    bytes: Buffer.from(await (file as File).arrayBuffer()),
  });
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "Captions saved", "notice");
}

// Saves a full new order, from drag and drop.
export async function reorderLessonsAction(courseId: string, orderedIds: string[]): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireSession();
  const result = await reorderLessons(actor, courseId, orderedIds);
  if (result.ok) revalidatePath(`/admin/courses/${courseId}`);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
