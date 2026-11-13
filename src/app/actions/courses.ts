"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { createCourse, addLesson, uploadLessonFile, setCoursePublished, reorderLessons } from "../../lib/learning/courses";
import { prisma } from "../../lib/db/client";
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
  const type = text(formData, "type") === "LINK" ? "LINK" : "TEXT";
  const result = await addLesson(actor, courseId, {
    title: text(formData, "title"),
    type,
    body: text(formData, "body"),
    url: text(formData, "url"),
  });
  const to = `/admin/courses/${courseId}`;
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "Lesson added", "notice");
}

export async function uploadLessonAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const to = `/admin/courses/${courseId}`;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) back(to, "Choose a file to upload", "error");
  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await uploadLessonFile(actor, courseId, {
    title: text(formData, "title"),
    type: text(formData, "type") === "VIDEO" ? "VIDEO" : "PDF",
    filename: file.name,
    mime: file.type,
    sizeBytes: file.size,
    bytes,
  });
  if (!result.ok) back(to, result.error, "error");
  revalidatePath(to);
  back(to, "File uploaded", "notice");
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
