"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { readSourceMaterial, type SourceMaterial } from "../../lib/ai/source";
import {
  requestCourseDraft, requestLessonDraft, requestQuestionsDraft, applyCourseDraft, applyLessonDraft, applyQuestionsDraft, discardDraft, getDraft,
} from "../../lib/ai/drafts";
import type { CourseDraft, AiQuestion, QuestionsDraft } from "../../lib/ai/content";
import type { Level } from "../../generated/prisma/client";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const num = (fd: FormData, key: string) => Number(text(fd, key));
const LEVELS: Level[] = ["BASIC", "INTERMEDIATE", "ADVANCED"];
const level = (v: string): Level => (LEVELS.includes(v as Level) ? (v as Level) : "BASIC");

function go(to: string, message: string, kind: "error" | "notice"): never {
  redirect(`${to}${to.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(message)}`);
}

// The optional reference file (a policy, datasheet or slide deck) the AI should work from.
async function sourceFrom(fd: FormData, back: string): Promise<SourceMaterial | null> {
  const file = fd.get("source");
  if (!(file instanceof File) || file.size === 0 || !file.name) return null;
  const read = await readSourceMaterial(file.name, Buffer.from(await file.arrayBuffer()));
  if (!read.ok) go(back, read.error, "error");
  return read.source;
}

export async function requestCourseDraftAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const back = "/admin/ai";
  const source = await sourceFrom(fd, back);
  const r = await requestCourseDraft(actor, {
    topic: text(fd, "topic"), subjectId: text(fd, "subjectId"), level: level(text(fd, "level")), audience: text(fd, "audience"),
    modules: num(fd, "modules"), lessonsPerModule: num(fd, "lessonsPerModule"), questions: num(fd, "questions"), notes: text(fd, "notes"),
  }, source);
  if (!r.ok) go(back, r.error, "error");
  redirect(`/admin/ai/${r.id}`);
}

export async function requestLessonDraftAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const lessonId = text(fd, "lessonId");
  const back = `/admin/ai?lesson=${encodeURIComponent(lessonId)}`;
  const source = await sourceFrom(fd, back);
  const r = await requestLessonDraft(actor, lessonId, text(fd, "instruction"), source);
  if (!r.ok) go(back, r.error, "error");
  redirect(`/admin/ai/${r.id}`);
}

export async function requestQuestionsDraftAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(fd, "courseId");
  const back = `/admin/ai?course=${encodeURIComponent(courseId)}`;
  const source = await sourceFrom(fd, back);
  const r = await requestQuestionsDraft(actor, courseId, num(fd, "count"), text(fd, "notes"), source);
  if (!r.ok) go(back, r.error, "error");
  redirect(`/admin/ai/${r.id}`);
}

// Reads the questions as the admin left them on the review page: ticked ones only, with any
// edits to the wording, options (one per line) and correct answers (one per line).
function editedQuestions(fd: FormData, original: AiQuestion[]): { all: AiQuestion[]; ticked: number[] } {
  const lines = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const all = original.map((q, i) => ({
    type: q.type,
    scenario: fd.has(`q${i}-scenario`) ? text(fd, `q${i}-scenario`) : q.scenario,
    text: fd.has(`q${i}-text`) ? text(fd, `q${i}-text`) : q.text,
    options: fd.has(`q${i}-options`) ? lines(text(fd, `q${i}-options`)) : q.options,
    correct: fd.has(`q${i}-correct`) ? lines(text(fd, `q${i}-correct`)) : q.correct,
    explanation: fd.has(`q${i}-explanation`) ? text(fd, `q${i}-explanation`) : q.explanation,
  }));
  const ticked = original.map((_, i) => i).filter((i) => fd.get(`q${i}-use`) === "on");
  return { all, ticked };
}

export async function applyDraftAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(fd, "id");
  const back = `/admin/ai/${id}`;
  const draft = await getDraft(actor, id);
  if (!draft || !draft.result) go("/admin/ai", "Draft not found", "error");

  if (draft.kind === "LESSON") {
    const r = await applyLessonDraft(actor, id, { title: text(fd, "title"), body: text(fd, "body") });
    if (!r.ok) go(back, r.error, "error");
    revalidatePath(`/admin/courses/${r.courseId}`);
    go(`/admin/courses/${r.courseId}`, "The lesson was updated with the reviewed AI text", "notice");
  }

  if (draft.kind === "QUESTIONS") {
    const { all, ticked } = editedQuestions(fd, (draft.result as QuestionsDraft).questions);
    const r = await applyQuestionsDraft(actor, id, ticked.map((i) => all[i]));
    if (!r.ok) go(back, r.error, "error");
    revalidatePath(`/admin/courses/${r.courseId}`);
    go(`/admin/courses/${r.courseId}`, `Added ${r.created} questions to the completion check${r.skipped.length ? `. Skipped: ${r.skipped.join("; ")}` : ""}`, "notice");
  }

  const original = draft.result as CourseDraft;
  const { all, ticked } = editedQuestions(fd, original.questions);
  const edited: CourseDraft = {
    title: text(fd, "title"),
    description: text(fd, "description"),
    modules: original.modules.map((m, mi) => ({
      title: text(fd, `m${mi}-title`),
      estimatedMinutes: Number(text(fd, `m${mi}-minutes`)) || m.estimatedMinutes,
      lessons: m.lessons.map((_, li) => (fd.get(`m${mi}-l${li}-use`) === "on" ? { title: text(fd, `m${mi}-l${li}-title`), body: text(fd, `m${mi}-l${li}-body`) } : { title: "", body: "" })),
    })),
    questions: all,
    sources: original.sources.filter((_, i) => fd.get(`s${i}-use`) === "on"),
    reviewNotes: original.reviewNotes,
  };
  const departments = text(fd, "departments").split(",").map((d) => d.trim()).filter(Boolean);
  const r = await applyCourseDraft(actor, id, edited, { subjectId: text(fd, "subjectId"), level: level(text(fd, "level")), departments, questionIndexes: ticked });
  if (!r.ok) go(back, r.error, "error");
  revalidatePath("/admin/courses");
  go(`/admin/courses/${r.courseId}`, `Created a draft course with ${r.lessons} lessons and ${r.questions} questions. Check it, then publish it.${r.skipped.length ? ` Skipped: ${r.skipped.join("; ")}` : ""}`, "notice");
}

export async function discardDraftAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const r = await discardDraft(actor, text(fd, "id"));
  if (!r.ok) go(`/admin/ai/${text(fd, "id")}`, r.error, "error");
  go("/admin/ai", "Draft discarded", "notice");
}
