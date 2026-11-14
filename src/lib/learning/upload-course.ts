import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import type { Level } from "../../generated/prisma/client";
import type { FileStorage } from "../storage/types";
import { createCourse, saveLessonFile, setCoursePublished } from "./courses";
import { assignCourse } from "./assignments";
import { cleanDepartments } from "./audience";

// A lesson title from an uploaded file name: "02_GST-basics.pdf" -> "02 GST-basics".
// Underscores become spaces; hyphens stay when they join words ("Month-end").
export function titleFromFilename(filename: string, index: number): string {
  const base = filename.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");
  const t = base.replace(/_+/g, " ").replace(/(?<![A-Za-z])-+|-+(?![A-Za-z])/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return t || `Part ${index + 1}`;
}

export type UploadedFile = { key: string; type: "PDF" | "VIDEO"; filename: string };
export type CourseUpload = {
  title: string; subjectId: string; level: Level; description: string;
  departments: string[]; publish: boolean; mandatory: boolean; dueAt: Date | null;
};

// Creates a course from uploaded files: one lesson per file, in upload order. Optionally
// publishes it and makes it mandatory for its departments. Stored files that do not become
// lessons are removed.
export async function createCourseFromFiles(
  actor: SessionUser, input: CourseUpload, files: UploadedFile[], storage: FileStorage,
): Promise<{ ok: true; id: string; message: string } | { ok: false; error: string }> {
  const discard = async (from = 0) => { for (const f of files.slice(from)) await storage.delete(f.key); };
  if (files.length === 0) return { ok: false, error: "Choose at least one PDF or MP4 file" };
  if (!input.title.trim()) {
    await discard();
    return { ok: false, error: "Give the course a title" };
  }
  if (!(await prisma.subject.findUnique({ where: { id: input.subjectId }, select: { id: true } }))) {
    await discard();
    return { ok: false, error: "Choose a subject" };
  }
  const departments = cleanDepartments(input.departments);
  if (input.mandatory && departments.length === 0) {
    await discard();
    return { ok: false, error: "Choose the departments the course is mandatory for" };
  }
  const created = await createCourse(actor, {
    subjectId: input.subjectId, title: input.title, description: input.description, level: input.level, passMarkPercent: 70, departments,
  });
  if (!created.ok || !created.id) {
    await discard();
    return { ok: false, error: created.ok ? "Could not create the course" : created.error };
  }
  const courseId = created.id;
  for (const [i, f] of files.entries()) {
    const saved = await saveLessonFile(actor, courseId, { title: titleFromFilename(f.filename, i), type: f.type, key: f.key }, storage);
    if (!saved.ok) {
      await discard(i + 1);
      return { ok: false, error: `The course was created, but "${f.filename}" could not be added: ${saved.error}` };
    }
  }
  const lessons = `${files.length} lesson${files.length === 1 ? "" : "s"}`;
  if (!input.publish) return { ok: true, id: courseId, message: `Course created as a draft with ${lessons}. Review it, then publish.` };
  const published = await setCoursePublished(actor, courseId, true);
  if (!published.ok) return { ok: true, id: courseId, message: `Course created with ${lessons}, but kept as a draft: ${published.error}` };
  if (!input.mandatory) return { ok: true, id: courseId, message: `Course published with ${lessons}.` };
  for (const d of departments) {
    const a = await assignCourse(actor, { courseId, targetType: "DEPARTMENT", targetValue: d, dueAt: input.dueAt });
    if (!a.ok) return { ok: true, id: courseId, message: `Course published, but not assigned to ${d}: ${a.error}` };
  }
  return { ok: true, id: courseId, message: `Course published with ${lessons} and made mandatory for ${departments.join(", ")}.` };
}
