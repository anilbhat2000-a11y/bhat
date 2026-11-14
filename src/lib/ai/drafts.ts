import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { recordAudit } from "../audit/record";
import type { Prisma } from "../../generated/prisma/client";
import { addLesson, createCourse, updateLessonText } from "../learning/courses";
import { addModule, assignLessonModules } from "../learning/modules";
import { addCompletionCheckQuestions } from "../assessments/admin";
import { aiEnabled, aiGenerator, AiError } from "./engine";
import type { SourceMaterial } from "./source";
import {
  SYSTEM_PROMPT, CourseDraftSchema, LessonDraftSchema, QuestionsDraftSchema, coursePrompt, lessonPrompt, questionsPrompt,
  toQuestionRows, cleanSources, tidyLessonBody,
  type CourseDraft, type CourseRequest, type LessonDraft, type QuestionsDraft, type AiQuestion,
} from "./content";

// The AI assistant's workflow. An admin asks for content; the request is saved as a draft and
// written in the background (a course takes a few minutes). The admin then reviews the draft,
// edits anything, and applies it. Nothing changes in the catalogue until a draft is applied,
// and AI courses are created as drafts that must still be published.

export type DraftKind = "COURSE" | "LESSON" | "QUESTIONS";
type Fail = { ok: false; error: string };
const asAdmin = (actor: SessionUser) => requireRole(actor, ["ADMIN"]);
const json = (v: unknown) => v as Prisma.InputJsonValue;
const STALE_MINUTES = 30;
const OFF = "The AI assistant is switched off. Add ANTHROPIC_API_KEY to .env and restart (see the admin manual).";

const running = new Set<Promise<void>>();
// For tests: resolves when every background job has finished.
export async function aiJobsIdle(): Promise<void> {
  while (running.size > 0) await Promise.all([...running]);
}

function inBackground(id: string, work: () => Promise<{ result: unknown; model: string; inputTokens: number; outputTokens: number }>): void {
  const job = (async () => {
    try {
      const r = await work();
      await prisma.aiDraft.update({ where: { id }, data: { status: "READY", result: json(r.result), model: r.model, inputTokens: r.inputTokens, outputTokens: r.outputTokens, error: null } });
    } catch (e) {
      const message = e instanceof AiError ? e.message : `Something went wrong: ${(e as Error).message}`;
      await prisma.aiDraft.update({ where: { id }, data: { status: "FAILED", error: message.slice(0, 1000) } }).catch(() => {});
    }
  })();
  running.add(job);
  void job.finally(() => running.delete(job));
}

async function newDraft(actor: SessionUser, data: { kind: DraftKind; title: string; courseId?: string; lessonId?: string; request: unknown; sourceName?: string }) {
  const draft = await prisma.aiDraft.create({
    data: { kind: data.kind, title: data.title.slice(0, 200), courseId: data.courseId, lessonId: data.lessonId, request: json({ ...(data.request as object), source: data.sourceName ?? null }), createdById: actor.id },
  });
  await prisma.$transaction((tx) => recordAudit(tx, { actorId: actor.id, action: "ai.request", entityType: "AiDraft", entityId: draft.id, after: { kind: data.kind, title: draft.title, courseId: data.courseId ?? null, lessonId: data.lessonId ?? null, source: data.sourceName ?? null } }));
  return draft.id;
}

const clampInt = (v: number, lo: number, hi: number, fallback: number) => (Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

// --- Asking for content -----------------------------------------------------------------

export async function requestCourseDraft(
  actor: SessionUser,
  input: { topic: string; subjectId: string; level: CourseRequest["level"]; audience: string; modules: number; lessonsPerModule: number; questions: number; notes: string },
  source: SourceMaterial | null,
): Promise<{ ok: true; id: string } | Fail> {
  asAdmin(actor);
  if (!aiEnabled()) return { ok: false, error: OFF };
  const topic = input.topic.trim().slice(0, 300);
  if (!topic) return { ok: false, error: "Describe the course topic" };
  const subject = await prisma.subject.findUnique({ where: { id: input.subjectId }, select: { name: true } });
  if (!subject) return { ok: false, error: "Choose a subject" };
  const request: CourseRequest & { subjectId: string } = {
    topic, subject: subject.name, subjectId: input.subjectId, level: input.level, audience: input.audience.trim().slice(0, 300),
    modules: clampInt(input.modules, 1, 8, 3), lessonsPerModule: clampInt(input.lessonsPerModule, 1, 5, 3),
    questions: clampInt(input.questions, 0, 30, 10), notes: input.notes.trim().slice(0, 4000),
  };
  const id = await newDraft(actor, { kind: "COURSE", title: topic, request, sourceName: source?.name });
  inBackground(id, async () => {
    const r = await aiGenerator().generate({ system: SYSTEM_PROMPT, content: coursePrompt(request, source), schema: CourseDraftSchema, maxTokens: 64000 });
    return { ...r, result: tidyCourse(r.data) };
  });
  return { ok: true, id };
}

export async function requestLessonDraft(actor: SessionUser, lessonId: string, instruction: string, source: SourceMaterial | null): Promise<{ ok: true; id: string } | Fail> {
  asAdmin(actor);
  if (!aiEnabled()) return { ok: false, error: OFF };
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: { select: { id: true, title: true, level: true } } } });
  if (!lesson) return { ok: false, error: "Lesson not found" };
  if (lesson.type !== "TEXT") return { ok: false, error: "The AI assistant can rewrite text lessons only" };
  const request = { courseTitle: lesson.course.title, level: lesson.course.level, lessonTitle: lesson.title, body: lesson.body ?? "", instruction: instruction.trim().slice(0, 4000) };
  const id = await newDraft(actor, { kind: "LESSON", title: lesson.title, courseId: lesson.course.id, lessonId, request: { instruction: request.instruction, before: { title: lesson.title, body: lesson.body ?? "" } }, sourceName: source?.name });
  inBackground(id, async () => {
    const r = await aiGenerator().generate({ system: SYSTEM_PROMPT, content: lessonPrompt(request, source), schema: LessonDraftSchema, maxTokens: 32000 });
    return { ...r, result: { ...r.data, title: r.data.title.trim() || lesson.title, body: tidyLessonBody(r.data.body) } satisfies LessonDraft };
  });
  return { ok: true, id };
}

export async function requestQuestionsDraft(actor: SessionUser, courseId: string, count: number, notes: string, source: SourceMaterial | null): Promise<{ ok: true; id: string } | Fail> {
  asAdmin(actor);
  if (!aiEnabled()) return { ok: false, error: OFF };
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: { lessons: { where: { type: "TEXT" }, orderBy: { position: "asc" }, select: { title: true, body: true } } } });
  if (!course) return { ok: false, error: "Course not found" };
  if (course.lessons.length === 0 && !source) return { ok: false, error: "This course has no text lessons. Attach the course material (for example its PDF or slides) so the AI knows what to ask about." };
  const n = clampInt(count, 1, 30, 10);
  const request = { courseTitle: course.title, level: course.level, count: n, notes: notes.trim().slice(0, 4000), lessons: course.lessons.map((l) => ({ title: l.title, body: l.body ?? "" })) };
  const id = await newDraft(actor, { kind: "QUESTIONS", title: `${n} questions for ${course.title}`, courseId, request: { count: n, notes: request.notes }, sourceName: source?.name });
  inBackground(id, async () => {
    const r = await aiGenerator().generate({ system: SYSTEM_PROMPT, content: questionsPrompt(request, source), schema: QuestionsDraftSchema, maxTokens: 32000 });
    return { ...r, result: r.data satisfies QuestionsDraft };
  });
  return { ok: true, id };
}

function tidyCourse(d: CourseDraft): CourseDraft {
  return {
    ...d,
    title: d.title.trim().slice(0, 200),
    description: d.description.trim().slice(0, 1000),
    modules: d.modules.map((m) => ({
      title: m.title.trim(),
      estimatedMinutes: clampInt(Math.round(m.estimatedMinutes), 1, 10000, 30),
      lessons: m.lessons.map((l) => ({ title: l.title.trim(), body: tidyLessonBody(l.body) })),
    })),
    sources: cleanSources(d.sources),
  };
}

// --- Reading drafts ---------------------------------------------------------------------

// Drafts still "writing" long after they started were interrupted (the server restarted).
export async function failStaleDrafts(now = new Date()): Promise<void> {
  await prisma.aiDraft.updateMany({
    where: { status: "GENERATING", updatedAt: { lt: new Date(now.getTime() - STALE_MINUTES * 60_000) } },
    data: { status: "FAILED", error: "Writing was interrupted (the server may have restarted). Start the request again." },
  });
}

export async function listDrafts(actor: SessionUser, take = 30) {
  asAdmin(actor);
  await failStaleDrafts();
  return prisma.aiDraft.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, kind: true, status: true, title: true, courseId: true, lessonId: true, createdAt: true, error: true } });
}

export async function getDraft(actor: SessionUser, id: string) {
  asAdmin(actor);
  await failStaleDrafts();
  return prisma.aiDraft.findUnique({ where: { id } });
}

async function readyDraft(id: string, kind: DraftKind) {
  const d = await prisma.aiDraft.findUnique({ where: { id } });
  if (!d || d.kind !== kind) return { error: "Draft not found" } as const;
  if (d.status === "APPLIED") return { error: "This draft was already applied" } as const;
  if (d.status !== "READY") return { error: "This draft is not ready to apply" } as const;
  return { draft: d } as const;
}

async function markApplied(actor: SessionUser, id: string, data: { courseId?: string; result?: unknown }, detail: Record<string, unknown>) {
  await prisma.$transaction(async (tx) => {
    await tx.aiDraft.update({ where: { id }, data: { status: "APPLIED", appliedAt: new Date(), ...(data.courseId && { courseId: data.courseId }), ...(data.result !== undefined && { result: json(data.result) }) } });
    await recordAudit(tx, { actorId: actor.id, action: "ai.apply", entityType: "AiDraft", entityId: id, after: json(detail) as Prisma.InputJsonObject });
  });
}

export async function discardDraft(actor: SessionUser, id: string): Promise<{ ok: true } | Fail> {
  asAdmin(actor);
  const d = await prisma.aiDraft.findUnique({ where: { id }, select: { status: true } });
  if (!d) return { ok: false, error: "Draft not found" };
  if (d.status === "APPLIED") return { ok: false, error: "An applied draft cannot be discarded" };
  await prisma.$transaction(async (tx) => {
    await tx.aiDraft.update({ where: { id }, data: { status: "DISCARDED" } });
    await recordAudit(tx, { actorId: actor.id, action: "ai.discard", entityType: "AiDraft", entityId: id });
  });
  return { ok: true };
}

// --- Applying drafts (after the admin's review and edits) -------------------------------

export async function applyCourseDraft(
  actor: SessionUser,
  id: string,
  edited: CourseDraft,
  options: { subjectId: string; level: CourseRequest["level"]; departments: string[]; questionIndexes: number[] },
): Promise<{ ok: true; courseId: string; lessons: number; questions: number; skipped: string[] } | Fail> {
  asAdmin(actor);
  const found = await readyDraft(id, "COURSE");
  if ("error" in found) return { ok: false, error: found.error ?? "Draft not found" };
  const draft = tidyCourse(edited);
  draft.modules = draft.modules.map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.title && l.body) })).filter((m) => m.title && m.lessons.length > 0);
  if (!draft.title) return { ok: false, error: "The course needs a title" };
  if (draft.modules.length === 0) return { ok: false, error: "Keep at least one module with a lesson" };
  const chosen = options.questionIndexes.filter((i) => i >= 0 && i < draft.questions.length).map((i) => draft.questions[i]);
  const { rows, skipped } = toQuestionRows(chosen);

  // Prevent a double click from creating the course twice.
  const claimed = await prisma.aiDraft.updateMany({ where: { id, status: "READY" }, data: { status: "APPLYING" } });
  if (claimed.count === 0) return { ok: false, error: "This draft is already being applied" };
  try {
    const subject = await prisma.subject.findUnique({ where: { id: options.subjectId }, select: { id: true } });
    if (!subject) throw new AiError("Choose a subject");
    const made = await createCourse(actor, { subjectId: subject.id, title: draft.title, description: draft.description, level: options.level, passMarkPercent: 70, departments: options.departments });
    if (!made.ok || !made.id) throw new AiError(made.ok ? "The course could not be created" : made.error);
    const courseId = made.id;
    const assignment: Record<string, string> = {};
    let lessons = 0;
    for (const m of draft.modules) {
      const mod = await addModule(actor, courseId, { title: m.title, estimatedMinutes: m.estimatedMinutes });
      if (!mod.ok || !mod.id) throw new AiError(mod.ok ? "A module could not be created" : mod.error);
      for (const l of m.lessons) {
        const lesson = await addLesson(actor, courseId, { title: l.title, type: "TEXT", body: l.body });
        if (!lesson.ok || !lesson.id) throw new AiError(lesson.ok ? "A lesson could not be created" : lesson.error);
        assignment[lesson.id] = mod.id;
        lessons++;
      }
    }
    const grouped = await assignLessonModules(actor, courseId, assignment);
    if (!grouped.ok) throw new AiError(grouped.error);
    await prisma.course.update({ where: { id: courseId }, data: { sources: json(draft.sources), contentSource: "ai" } });
    let questions = 0;
    if (rows.length > 0) {
      const added = await addCompletionCheckQuestions(actor, courseId, rows);
      if (!added.ok) skipped.push(...added.errors.map((e) => `Question ${e.row}: ${e.reason}`));
      else questions = added.created;
    }
    await markApplied(actor, id, { courseId, result: draft }, { courseId, title: draft.title, modules: draft.modules.length, lessons, questions });
    return { ok: true, courseId, lessons, questions, skipped };
  } catch (e) {
    await prisma.aiDraft.update({ where: { id }, data: { status: "READY" } });
    return { ok: false, error: e instanceof AiError ? e.message : (e as Error).message };
  }
}

export async function applyLessonDraft(actor: SessionUser, id: string, edited: { title: string; body: string }): Promise<{ ok: true; lessonId: string; courseId: string } | Fail> {
  asAdmin(actor);
  const found = await readyDraft(id, "LESSON");
  if ("error" in found) return { ok: false, error: found.error ?? "Draft not found" };
  const { draft } = found;
  if (!draft.lessonId) return { ok: false, error: "The lesson for this draft no longer exists" };
  const body = tidyLessonBody(edited.body);
  const saved = await updateLessonText(actor, draft.lessonId, { title: edited.title, body });
  if (!saved.ok) return saved;
  await markApplied(actor, id, { result: { ...(draft.result as object), title: edited.title.trim(), body } }, { lessonId: draft.lessonId, courseId: draft.courseId });
  return { ok: true, lessonId: draft.lessonId, courseId: draft.courseId ?? "" };
}

export async function applyQuestionsDraft(actor: SessionUser, id: string, chosen: AiQuestion[]): Promise<{ ok: true; created: number; skipped: string[]; courseId: string } | Fail> {
  asAdmin(actor);
  const found = await readyDraft(id, "QUESTIONS");
  if ("error" in found) return { ok: false, error: found.error ?? "Draft not found" };
  const { draft } = found;
  if (!draft.courseId) return { ok: false, error: "The course for this draft no longer exists" };
  const { rows, skipped } = toQuestionRows(chosen);
  if (rows.length === 0) return { ok: false, error: skipped.length ? `No question can be added. ${skipped.join("; ")}` : "Tick at least one question" };
  const added = await addCompletionCheckQuestions(actor, draft.courseId, rows);
  if (!added.ok) return { ok: false, error: added.errors.map((e) => `Question ${e.row}: ${e.reason}`).join("; ") };
  await markApplied(actor, id, {}, { courseId: draft.courseId, questions: added.created });
  return { ok: true, created: added.created, skipped, courseId: draft.courseId };
}
