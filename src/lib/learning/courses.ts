import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { defaultStorage, mimeForKey } from "../storage";
import type { FileStorage } from "../storage/types";
import { validateUpload } from "../storage/validate";
import type { Level, LessonType } from "../../generated/prisma/client";
import { recordAudit, writeWithAudit } from "../audit/record";
import { canPublishLesson } from "./publish";
import { parseLabChecklist } from "./labs";

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
  const course = await writeWithAudit(
    (tx) =>
      tx.course.create({
        data: {
          subjectId: input.subjectId,
          title: input.title.trim(),
          description: input.description.trim() || null,
          level: input.level,
          passMarkPercent: input.passMarkPercent,
        },
      }),
    (c) => ({ actorId: actor.id, action: "course.create", entityType: "Course", entityId: c.id, after: { title: c.title } }),
  );
  return { ok: true, id: course.id };
}

export async function updateCourse(
  actor: SessionUser,
  id: string,
  patch: { title?: string; description?: string; level?: Level; passMarkPercent?: number },
): Promise<Result> {
  asAdmin(actor);
  await writeWithAudit((tx) => tx.course.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.description !== undefined && { description: patch.description.trim() || null }),
      ...(patch.level !== undefined && { level: patch.level }),
      ...(patch.passMarkPercent !== undefined && { passMarkPercent: patch.passMarkPercent }),
    },
  }), () => ({ actorId: actor.id, action: "course.update", entityType: "Course", entityId: id, after: { ...patch } }));
  return { ok: true, id };
}

// Publishing needs at least one lesson. The subject is required by the schema.
export async function setCoursePublished(actor: SessionUser, id: string, published: boolean): Promise<Result> {
  asAdmin(actor);
  if (published) {
    const lessons = await prisma.lesson.findMany({
      where: { courseId: id },
      select: { type: true, captionFileKey: true, liveSession: { select: { id: true } } },
    });
    if (lessons.length === 0) return { ok: false, error: "Add at least one lesson before publishing" };
    for (const l of lessons) {
      const check = canPublishLesson(l);
      if (!check.ok) return { ok: false, error: check.reason };
      if (l.type === "LIVE_SESSION" && !l.liveSession) {
        return { ok: false, error: "Schedule every live session before publishing the course" };
      }
    }
  }
  const before = await prisma.course.findUnique({ where: { id }, select: { status: true } });
  await writeWithAudit(
    (tx) => tx.course.update({ where: { id }, data: { status: published ? "PUBLISHED" : "DRAFT" } }),
    () => ({
      actorId: actor.id,
      action: published ? "course.publish" : "course.unpublish",
      entityType: "Course",
      entityId: id,
      before: { status: before?.status ?? null },
      after: { status: published ? "PUBLISHED" : "DRAFT" },
    }),
  );
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
  if (input.type === "LAB" && parseLabChecklist(input.body ?? "").length === 0) {
    return { ok: false, error: "A lab needs at least one checklist step: a line such as '- [ ] Create the VLAN'" };
  }
  if ((input.type === "TEXT" || input.type === "LAB") && !(input.body ?? "").trim()) {
    return { ok: false, error: input.type === "LAB" ? "Labs need a checklist: one '- [ ] step' line per item" : "Text lessons need content" };
  }
  if (input.type === "LINK" && !HTTP_URL.test(input.url ?? "")) return { ok: false, error: "Enter a full http or https link" };
  const position = await nextPosition(courseId);
  const lesson = await writeWithAudit(
    (tx) =>
      tx.lesson.create({
        data: {
          courseId,
          position,
          title: input.title.trim(),
          type: input.type,
          body: input.type === "TEXT" || input.type === "LAB" ? input.body : null,
          url: input.type === "LINK" ? input.url : null,
        },
      }),
    (l) => ({ actorId: actor.id, action: "lesson.add", entityType: "Lesson", entityId: l.id, after: { courseId, type: input.type } }),
  );
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
    const position = await nextPosition(courseId);
    const lesson = await writeWithAudit(
      (tx) =>
        tx.lesson.create({
          data: { courseId, position, title: input.title.trim(), type: input.type as LessonType, fileKey: checked.key },
        }),
      (l) => ({ actorId: actor.id, action: "lesson.upload", entityType: "Lesson", entityId: l.id, after: { courseId, type: input.type } }),
    );
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
// Returns the stored key and type (not the bytes, so the route can stream a range);
// null (shown as 404) for every other case, including unknown lessons.
export async function getLessonFile(
  actor: SessionUser,
  lessonId: string,
): Promise<{ key: string; mime: string; title: string } | null> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson || !lesson.fileKey) return null;
  const allowed = actor.role === "ADMIN" || lesson.course.status === "PUBLISHED";
  if (!allowed) return null;
  return { key: lesson.fileKey, mime: mimeForKey(lesson.fileKey), title: lesson.title };
}

// The WebVTT captions of a video lesson, under the same access rule as the video.
export async function getLessonCaption(actor: SessionUser, lessonId: string): Promise<{ key: string } | null> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson || !lesson.captionFileKey) return null;
  const allowed = actor.role === "ADMIN" || lesson.course.status === "PUBLISHED";
  return allowed ? { key: lesson.captionFileKey } : null;
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
    await writeWithAudit(
      (tx) => tx.lesson.update({ where: { id: lessonId }, data: { captionFileKey: checked.key } }),
      () => ({ actorId: actor.id, action: "caption.attach", entityType: "Lesson", entityId: lessonId, after: { captionFileKey: checked.key } }),
    );
  } catch {
    await storage.delete(checked.key);
    return { ok: false, error: "Could not save the caption file. Nothing was stored." };
  }
  if (lesson.captionFileKey) await storage.delete(lesson.captionFileKey);
  return { ok: true, id: lessonId };
}

// Only a draft can be deleted. Its lessons go with it; uploaded files are not removed here.
export async function deleteCourse(actor: SessionUser, id: string): Promise<Result> {
  asAdmin(actor);
  const course = await prisma.course.findUnique({ where: { id }, select: { status: true, title: true } });
  if (!course) return { ok: false, error: "Course not found" };
  if (course.status !== "DRAFT") return { ok: false, error: "Unpublish the course before deleting it" };
  await prisma.$transaction(async (tx) => {
    await tx.course.delete({ where: { id } });
    await recordAudit(tx, { actorId: actor.id, action: "course.delete", entityType: "Course", entityId: id, before: { title: course.title } });
  });
  return { ok: true, id };
}

// Deleting a lesson removes its progress records with it, so learners' course progress may
// refer to a lesson that no longer exists; the course list order is kept.
export async function deleteLesson(actor: SessionUser, lessonId: string): Promise<Result> {
  asAdmin(actor);
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true, title: true } });
  if (!lesson) return { ok: false, error: "Lesson not found" };
  await prisma.$transaction(async (tx) => {
    await tx.lesson.delete({ where: { id: lessonId } });
    await recordAudit(tx, { actorId: actor.id, action: "lesson.delete", entityType: "Lesson", entityId: lessonId, before: { title: lesson.title, courseId: lesson.courseId } });
  });
  return { ok: true, id: lessonId };
}
