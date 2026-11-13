import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { defaultStorage, mimeForKey } from "../storage";
import type { FileStorage } from "../storage/types";
import { validateUpload } from "../storage/validate";
import type { Level, LessonType } from "../../generated/prisma/client";
import { recordAudit } from "../audit/record";
import { canPublishLesson } from "./publish";

export type Result = { ok: true; id?: string } | { ok: false; error: string };
const HTTP_URL = /^https?:\/\/\S+$/i;

// Content is authored by admins. Learners only read through getLessonFile.
const asAdmin = (actor: SessionUser) => requireRole(actor, ["ADMIN"]);

export async function createCourse(
  actor: SessionUser,
  input: { subjectId: string; title: string; description: string; level: Level; passMarkPercent: number },
): Promise<Result> {
  asAdmin(actor);
  if (!input.title.trim()) return { ok: false, error: "Title is required" };
  if (!Number.isInteger(input.passMarkPercent) || input.passMarkPercent < 1 || input.passMarkPercent > 100) {
    return { ok: false, error: "Pass mark must be between 1 and 100" };
  }
  const course = await prisma.course.create({
    data: {
      subjectId: input.subjectId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      level: input.level,
      passMarkPercent: input.passMarkPercent,
    },
  });
  await recordAudit(prisma, { actorId: actor.id, action: "course.create", entityType: "Course", entityId: course.id, after: { title: course.title } });
  return { ok: true, id: course.id };
}

export async function updateCourse(
  actor: SessionUser,
  id: string,
  patch: { title?: string; description?: string; level?: Level; passMarkPercent?: number },
): Promise<Result> {
  asAdmin(actor);
  await prisma.course.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.description !== undefined && { description: patch.description.trim() || null }),
      ...(patch.level !== undefined && { level: patch.level }),
      ...(patch.passMarkPercent !== undefined && { passMarkPercent: patch.passMarkPercent }),
    },
  });
  return { ok: true, id };
}

// Publishing needs at least one lesson. The subject is required by the schema.
export async function setCoursePublished(actor: SessionUser, id: string, published: boolean): Promise<Result> {
  asAdmin(actor);
  if (published) {
    const lessons = await prisma.lesson.findMany({ where: { courseId: id }, select: { type: true, captionFileKey: true } });
    if (lessons.length === 0) return { ok: false, error: "Add at least one lesson before publishing" };
    for (const l of lessons) {
      const check = canPublishLesson(l);
      if (!check.ok) return { ok: false, error: check.reason };
    }
  }
  const before = await prisma.course.findUnique({ where: { id }, select: { status: true } });
  await prisma.course.update({ where: { id }, data: { status: published ? "PUBLISHED" : "DRAFT" } });
  await recordAudit(prisma, {
    actorId: actor.id,
    action: published ? "course.publish" : "course.unpublish",
    entityType: "Course",
    entityId: id,
    before: { status: before?.status ?? null },
    after: { status: published ? "PUBLISHED" : "DRAFT" },
  });
  return { ok: true, id };
}

async function nextPosition(courseId: string): Promise<number> {
  const last = await prisma.lesson.findFirst({ where: { courseId }, orderBy: { position: "desc" } });
  return (last?.position ?? 0) + 1;
}

export async function addLesson(
  actor: SessionUser,
  courseId: string,
  input: { title: string; type: "TEXT" | "LINK" | "LIVE_SESSION" | "LAB"; body?: string; url?: string },
): Promise<Result> {
  asAdmin(actor);
  if (!input.title.trim()) return { ok: false, error: "Title is required" };
  if ((input.type === "TEXT" || input.type === "LAB") && !(input.body ?? "").trim()) {
    return { ok: false, error: input.type === "LAB" ? "Labs need a checklist: one '- [ ] step' line per item" : "Text lessons need content" };
  }
  if (input.type === "LINK" && !HTTP_URL.test(input.url ?? "")) return { ok: false, error: "Enter a full http or https link" };
  const lesson = await prisma.lesson.create({
    data: {
      courseId,
      position: await nextPosition(courseId),
      title: input.title.trim(),
      type: input.type,
      body: input.type === "TEXT" || input.type === "LAB" ? input.body : null,
      url: input.type === "LINK" ? input.url : null,
    },
  });
  await recordAudit(prisma, { actorId: actor.id, action: "lesson.add", entityType: "Lesson", entityId: lesson.id, after: { courseId, type: input.type } });
  return { ok: true, id: lesson.id };
}

// Validation runs before anything is stored. If the lesson cannot be saved, the stored
// file is removed, so a failed upload leaves no partial record (spec 8).
export async function uploadLessonFile(
  actor: SessionUser,
  courseId: string,
  input: { title: string; type: "PDF" | "VIDEO"; filename: string; mime: string; sizeBytes: number; bytes: Buffer },
  storage: FileStorage = defaultStorage(),
): Promise<Result> {
  asAdmin(actor);
  if (!input.title.trim()) return { ok: false, error: "Title is required" };
  const checked = validateUpload(
    { filename: input.filename, mime: input.mime, sizeBytes: input.sizeBytes },
    input.type === "PDF" ? "DOCUMENT" : "VIDEO",
  );
  if (!checked.ok) return { ok: false, error: checked.reason };
  if (!(await prisma.course.findUnique({ where: { id: courseId } }))) return { ok: false, error: "Course not found" };

  await storage.put(checked.key, input.bytes);
  try {
    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        position: await nextPosition(courseId),
        title: input.title.trim(),
        type: input.type as LessonType,
        fileKey: checked.key,
      },
    });
    await recordAudit(prisma, { actorId: actor.id, action: "lesson.upload", entityType: "Lesson", entityId: lesson.id, after: { courseId, type: input.type } });
    return { ok: true, id: lesson.id };
  } catch {
    await storage.delete(checked.key);
    return { ok: false, error: "Could not save the lesson. Nothing was stored." };
  }
}

// Two-step update, because (courseId, position) is unique: park positions first.
export async function reorderLessons(actor: SessionUser, courseId: string, orderedIds: string[]): Promise<Result> {
  asAdmin(actor);
  const lessons = await prisma.lesson.findMany({ where: { courseId }, select: { id: true } });
  const current = new Set(lessons.map((l) => l.id));
  const requested = new Set(orderedIds);
  if (orderedIds.length !== current.size || requested.size !== current.size || orderedIds.some((id) => !current.has(id))) {
    return { ok: false, error: "The lesson list does not match this course" };
  }
  await prisma.$transaction(async (tx) => {
    for (const [i, id] of orderedIds.entries()) {
      await tx.lesson.update({ where: { id }, data: { position: -(i + 1) } });
    }
    for (const [i, id] of orderedIds.entries()) {
      await tx.lesson.update({ where: { id }, data: { position: i + 1 } });
    }
    await recordAudit(tx, { actorId: actor.id, action: "lesson.reorder", entityType: "Course", entityId: courseId, after: { order: orderedIds } });
  });
  return { ok: true, id: courseId };
}

// Files are served only to admins, or to anyone when the course is published.
// Returns null (shown as 404) for every other case, including unknown lessons.
export async function getLessonFile(
  actor: SessionUser,
  lessonId: string,
  storage: FileStorage = defaultStorage(),
): Promise<{ bytes: Buffer; mime: string; title: string } | null> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson || !lesson.fileKey) return null;
  const allowed = actor.role === "ADMIN" || lesson.course.status === "PUBLISHED";
  if (!allowed) return null;
  return { bytes: await storage.get(lesson.fileKey), mime: mimeForKey(lesson.fileKey), title: lesson.title };
}


// Attaches a WebVTT caption file to a video lesson. Stored through the same storage and
// validation as other uploads; a failed save removes the stored file.
export async function attachCaption(
  actor: SessionUser,
  lessonId: string,
  input: { filename: string; mime: string; sizeBytes: number; bytes: Buffer },
  storage: FileStorage = defaultStorage(),
): Promise<Result> {
  asAdmin(actor);
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.type !== "VIDEO") return { ok: false, error: "Captions can only be added to video lessons" };
  const checked = validateUpload({ filename: input.filename, mime: input.mime, sizeBytes: input.sizeBytes }, "CAPTION");
  if (!checked.ok) return { ok: false, error: checked.reason };
  await storage.put(checked.key, input.bytes);
  try {
    await prisma.lesson.update({ where: { id: lessonId }, data: { captionFileKey: checked.key } });
  } catch {
    await storage.delete(checked.key);
    return { ok: false, error: "Could not save the caption file. Nothing was stored." };
  }
  if (lesson.captionFileKey) await storage.delete(lesson.captionFileKey);
  return { ok: true, id: lessonId };
}
