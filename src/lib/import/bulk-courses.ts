import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import type { Level } from "../../generated/prisma/client";
import type { FileStorage } from "../storage/types";
import { addLesson, createCourse, saveLessonFile, setCoursePublished } from "../learning/courses";
import { addModule, assignLessonModules } from "../learning/modules";
import { assignCourse } from "../learning/assignments";
import { cleanDepartments } from "../learning/audience";
import { titleFromFilename } from "../learning/upload-course";
import { addCompletionCheckQuestions } from "../assessments/admin";
import { parseQuestionRows } from "./questions";
import { rowsFromSheet } from "./question-files";

// Bulk course upload: an Excel workbook (sheets Courses, Modules, Lessons, Questions; see
// templates.ts) plus the lesson files it names. Everything is checked first; if anything
// is wrong, nothing is created and every problem is reported. Then each course is created
// with its modules, lessons (files are converted in the background as usual), completion
// check, publishing and department assignment.

export type Row = Record<string, string> & { __row: string };
export type StoredFile = { name: string; key: string; caption: boolean };
export type Problem = { where: string; reason: string };
export type CourseResult = { id: string; title: string; modules: number; lessons: number; questions: number; status: string; notes: string[] };
export type BulkReport = { ok: boolean; problems: Problem[]; warnings: string[]; courses: CourseResult[] };

const LEVELS: Record<string, Level> = { basic: "BASIC", intermediate: "INTERMEDIATE", advanced: "ADVANCED", beginner: "BASIC" };
const yes = (v: string | undefined) => /^(y|yes|true|1)$/i.test((v ?? "").trim());
const norm = (s: string) => s.trim().toLowerCase();

type PlannedLesson = { row: string; module: number | null; title: string; kind: "FILE" | "TEXT" | "LINK"; file?: StoredFile; text?: string; url?: string; caption?: StoredFile };
type PlannedCourse = {
  row: string; code: string; title: string; subjectId: string; subjectName: string; level: Level; description: string;
  departments: string[]; passMark: number; publish: boolean; mandatory: boolean; dueAt: Date | null;
  modules: { number: number; title: string; minutes: number | null }[];
  lessons: PlannedLesson[];
  questions: ReturnType<typeof rowsFromSheet>;
};

export async function planBulkUpload(sheets: Map<string, Row[]>, files: StoredFile[], now: Date = new Date()) {
  const problems: Problem[] = [];
  const at = (sheet: string, row: string) => `${sheet}, row ${row}`;
  const courseRows = sheets.get("courses") ?? [];
  if (courseRows.length === 0) problems.push({ where: "Courses sheet", reason: "No courses found. Use the template: the Courses sheet needs at least one row under the headings." });

  const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
  const subjectByName = new Map(subjects.map((s) => [norm(s.name), s]));
  const fileByName = new Map(files.map((f) => [norm(f.name), f]));
  const usedFiles = new Set<string>();
  const courses = new Map<string, PlannedCourse>();

  for (const r of courseRows) {
    const where = at("Courses", r.__row);
    const code = (r["course code"] ?? r.code ?? "").trim();
    const title = (r.title ?? r["course title"] ?? "").trim();
    if (!code) { problems.push({ where, reason: "Course code is required (for example C1)" }); continue; }
    if (courses.has(norm(code))) { problems.push({ where, reason: `Course code ${code} is used more than once` }); continue; }
    if (!title) problems.push({ where, reason: "Title is required" });
    const subject = subjectByName.get(norm(r.subject ?? ""));
    if (!subject) problems.push({ where, reason: `Subject "${r.subject ?? ""}" is not in the portal. Use one of: ${subjects.map((s) => s.name).join(", ")}` });
    const level = LEVELS[norm(r.level ?? "") || "basic"];
    if (!level) problems.push({ where, reason: "Level must be Basic, Intermediate or Advanced" });
    const passMark = r["pass mark"] ? Number(r["pass mark"]) : 70;
    if (!Number.isInteger(passMark) || passMark < 1 || passMark > 100) problems.push({ where, reason: "Pass mark must be a whole number from 1 to 100" });
    const departments = cleanDepartments((r.departments ?? r.department ?? "").split(","));
    const publish = yes(r.publish);
    const mandatory = yes(r.mandatory);
    if (mandatory && departments.length === 0) problems.push({ where, reason: "Mandatory needs at least one department in the Departments column" });
    if (mandatory && !publish) problems.push({ where, reason: "Mandatory needs Publish = Yes" });
    let dueAt: Date | null = null;
    if ((r["due date"] ?? "").trim()) {
      const d = (r["due date"] ?? "").trim().slice(0, 10);
      dueAt = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T23:59:59+05:30`) : null;
      if (!dueAt) problems.push({ where, reason: "Due date must be written YYYY-MM-DD" });
      else if (dueAt < now) problems.push({ where, reason: "Due date must be in the future" });
    }
    if (subject && title && (await prisma.course.findFirst({ where: { subjectId: subject.id, title: { equals: title, mode: "insensitive" } }, select: { id: true } }))) {
      problems.push({ where, reason: `A course called "${title}" already exists in ${subject.name}. Use a different title, or change the existing course instead.` });
    }
    courses.set(norm(code), {
      row: r.__row, code, title, subjectId: subject?.id ?? "", subjectName: subject?.name ?? "", level: level ?? "BASIC",
      description: (r.description ?? "").trim(), departments, passMark, publish, mandatory, dueAt, modules: [], lessons: [], questions: [],
    });
  }

  const courseFor = (sheet: string, r: Row) => {
    const code = (r["course code"] ?? r.code ?? "").trim();
    const c = courses.get(norm(code));
    if (!c) problems.push({ where: at(sheet, r.__row), reason: code ? `Course code ${code} is not on the Courses sheet` : "Course code is required" });
    return c;
  };

  for (const r of sheets.get("modules") ?? []) {
    const c = courseFor("Modules", r);
    if (!c) continue;
    const where = at("Modules", r.__row);
    const number = Number(r["module number"] ?? r.module ?? r.number);
    const title = (r["module title"] ?? r.title ?? "").trim();
    const minutes = (r.minutes ?? "").trim() ? Number(r.minutes) : null;
    if (!Number.isInteger(number) || number < 1) { problems.push({ where, reason: "Module number must be 1, 2, 3 ..." }); continue; }
    if (c.modules.some((m) => m.number === number)) { problems.push({ where, reason: `Module ${number} appears twice for ${c.code}` }); continue; }
    if (!title) problems.push({ where, reason: "Module title is required" });
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 10000)) problems.push({ where, reason: "Minutes must be a whole number from 1 to 10000" });
    c.modules.push({ number, title, minutes });
  }

  for (const r of sheets.get("lessons") ?? []) {
    const c = courseFor("Lessons", r);
    if (!c) continue;
    const where = at("Lessons", r.__row);
    const fileName = (r["file name"] ?? r.file ?? "").trim();
    const url = (r.url ?? r.link ?? "").trim();
    const text = (r.text ?? r.body ?? "").trim();
    const typeRaw = norm(r.type ?? "");
    const kind = typeRaw === "file" || (!typeRaw && fileName) ? "FILE" : typeRaw === "link" || (!typeRaw && url) ? "LINK" : typeRaw === "text" || (!typeRaw && text) ? "TEXT" : null;
    if (!kind) { problems.push({ where, reason: "Type must be File, Text or Link" }); continue; }
    const moduleText = (r["module number"] ?? r.module ?? "").trim();
    const module = moduleText ? Number(moduleText) : null;
    if (module !== null && !c.modules.some((m) => m.number === module)) problems.push({ where, reason: `Module ${moduleText} is not on the Modules sheet for ${c.code}` });
    let title = (r["lesson title"] ?? r.title ?? "").trim();
    const lesson: PlannedLesson = { row: r.__row, module, title, kind };
    if (kind === "FILE") {
      const f = fileByName.get(norm(fileName));
      if (!fileName) problems.push({ where, reason: "File name is required for a File lesson" });
      else if (!f || f.caption) problems.push({ where, reason: `File "${fileName}" was not uploaded. Upload it with the workbook (or in the ZIP), with exactly this name.` });
      else if (usedFiles.has(f.key)) problems.push({ where, reason: `File "${fileName}" is used by two lessons. Upload a copy with a different name.` });
      else { usedFiles.add(f.key); lesson.file = f; }
      title ||= titleFromFilename(fileName, c.lessons.length);
      const captionName = (r["caption file"] ?? r.captions ?? "").trim();
      if (captionName) {
        const cap = fileByName.get(norm(captionName));
        if (!cap || !cap.caption) problems.push({ where, reason: `Caption file "${captionName}" was not uploaded (it must be a .vtt file)` });
        else if (!/\.(mp4|mov|mkv)$/i.test(fileName)) problems.push({ where, reason: "Caption files are only for video lessons" });
        else { usedFiles.add(cap.key); lesson.caption = cap; }
      }
    } else if (kind === "LINK") {
      if (!/^https?:\/\/\S+$/i.test(url)) problems.push({ where, reason: "URL must start with http:// or https://" });
      lesson.url = url;
    } else {
      if (!text) problems.push({ where, reason: "Text is required for a Text lesson" });
      lesson.text = text;
    }
    if (!title) problems.push({ where, reason: "Lesson title is required" });
    lesson.title = title;
    c.lessons.push(lesson);
  }

  const questionsByCourse = new Map<string, Row[]>();
  for (const r of sheets.get("questions") ?? []) {
    const c = courseFor("Questions", r);
    if (c) questionsByCourse.set(c.code, [...(questionsByCourse.get(c.code) ?? []), r]);
  }
  for (const c of courses.values()) {
    if (c.lessons.length === 0) problems.push({ where: at("Courses", c.row), reason: `Course ${c.code} has no lessons on the Lessons sheet` });
    const rows = rowsFromSheet(questionsByCourse.get(c.code) ?? [], "Questions, row");
    if (rows.length > 0) {
      const checked = parseQuestionRows(rows);
      if (!checked.ok) for (const e of checked.errors) problems.push({ where: rows[e.row - 1]?.source ?? "Questions", reason: e.reason });
      c.questions = rows;
    }
  }

  const unused = files.filter((f) => !usedFiles.has(f.key));
  return { problems, courses: [...courses.values()], unused };
}

// Creates the planned courses. Called only when the plan has no problems.
export async function runBulkUpload(actor: SessionUser, plan: Awaited<ReturnType<typeof planBulkUpload>>, storage: FileStorage): Promise<BulkReport> {
  const warnings: string[] = [];
  for (const f of plan.unused) {
    await storage.delete(f.key);
    warnings.push(`"${f.name}" was uploaded but not used by any lesson, so it was not kept.`);
  }
  const results: CourseResult[] = [];
  for (const c of plan.courses) {
    const notes: string[] = [];
    const made = await createCourse(actor, { subjectId: c.subjectId, title: c.title, description: c.description, level: c.level, passMarkPercent: c.passMark, departments: c.departments });
    if (!made.ok || !made.id) {
      warnings.push(`${c.code} "${c.title}" was not created: ${made.ok ? "unknown error" : made.error}`);
      for (const l of c.lessons) { if (l.file) await storage.delete(l.file.key); if (l.caption) await storage.delete(l.caption.key); }
      continue;
    }
    const courseId = made.id;
    const moduleIds = new Map<number, string>();
    for (const m of [...c.modules].sort((a, b) => a.number - b.number)) {
      const added = await addModule(actor, courseId, { title: m.title, estimatedMinutes: m.minutes });
      if (added.ok && added.id) moduleIds.set(m.number, added.id);
      else notes.push(`Module ${m.number} not added: ${added.ok ? "" : added.error}`);
    }
    const placement: Record<string, string | null> = {};
    let lessons = 0;
    for (const l of c.lessons) {
      const saved = l.kind === "FILE" && l.file
        ? await saveLessonFile(actor, courseId, { title: l.title, key: l.file.key, filename: l.file.name }, storage)
        : await addLesson(actor, courseId, { title: l.title, type: l.kind === "LINK" ? "LINK" : "TEXT", body: l.text, url: l.url });
      if (!saved.ok || !saved.id) {
        notes.push(`Lessons row ${l.row} ("${l.title}") not added: ${saved.ok ? "" : saved.error}`);
        if (l.caption) await storage.delete(l.caption.key);
        continue;
      }
      lessons++;
      if (l.caption) await prisma.lesson.update({ where: { id: saved.id }, data: { captionFileKey: l.caption.key } });
      if (l.module !== null && moduleIds.has(l.module)) placement[saved.id] = moduleIds.get(l.module) as string;
    }
    if (Object.keys(placement).length > 0) await assignLessonModules(actor, courseId, placement);
    let questions = 0;
    if (c.questions.length > 0) {
      const added = await addCompletionCheckQuestions(actor, courseId, c.questions);
      if (added.ok) questions = added.created;
      else notes.push(`Questions not added: ${added.errors.slice(0, 3).map((e) => e.reason).join("; ")}`);
    }
    let status = "Draft";
    if (c.publish) {
      const published = await setCoursePublished(actor, courseId, true);
      if (published.ok) status = "Published";
      else notes.push(`Kept as a draft: ${published.error}`);
    }
    if (c.mandatory && status === "Published") {
      for (const d of c.departments) {
        const a = await assignCourse(actor, { courseId, targetType: "DEPARTMENT", targetValue: d, dueAt: c.dueAt });
        if (!a.ok) notes.push(`Not assigned to ${d}: ${a.error}`);
      }
      notes.push(`Mandatory for ${c.departments.join(", ")}`);
    }
    results.push({ id: courseId, title: c.title, modules: moduleIds.size, lessons, questions, status, notes });
  }
  return { ok: true, problems: [], warnings, courses: results };
}
