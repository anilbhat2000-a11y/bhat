import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { aiEnabled, useAiGenerator, AiError, type AiGenerator, type AiRequest } from "./engine";
import { toQuestionRows, cleanSources, tidyLessonBody, coursePrompt, type CourseDraft, type LessonDraft, type QuestionsDraft } from "./content";
import { readSourceMaterial } from "./source";
import {
  requestCourseDraft, requestLessonDraft, requestQuestionsDraft, applyCourseDraft, applyLessonDraft, applyQuestionsDraft, discardDraft, aiJobsIdle, failStaleDrafts,
} from "./drafts";
import { addLesson } from "../learning/courses";
import { questionsWordExample } from "../import/templates";

const LESSON = "Intro paragraph.\n\n## What it is\n\n- one\n- two\n\n## Key terms\n\n- **SLA**: service level agreement";

function fake(answer: (req: AiRequest<unknown>) => unknown, seen: AiRequest<unknown>[] = []): AiGenerator {
  return {
    async generate<T>(req: AiRequest<T>) {
      seen.push(req as AiRequest<unknown>);
      const data = answer(req as AiRequest<unknown>);
      if (data instanceof Error) throw data;
      return { data: req.schema.parse(data) as T, model: "fake-model", inputTokens: 10, outputTokens: 20 };
    },
  };
}

describe("AI helpers", () => {
  it("is on only with an API key, and can be switched off", () => {
    expect(aiEnabled({})).toBe(false);
    expect(aiEnabled({ ANTHROPIC_API_KEY: "k" })).toBe(true);
    expect(aiEnabled({ ANTHROPIC_API_KEY: "k", AI_ENABLED: "false" })).toBe(false);
  });

  it("turns AI questions into import rows and skips broken ones", () => {
    const { rows, skipped } = toQuestionRows([
      { type: "SINGLE", scenario: "", text: "Pick B", options: ["A", "B", "C"], correct: ["b"], explanation: "Because" },
      { type: "MULTIPLE", scenario: "At a site", text: "Pick two", options: ["A", "B", "C"], correct: ["A", "C"], explanation: "" },
      { type: "TRUE_FALSE", scenario: "", text: "Sky is blue", options: ["True", "False"], correct: ["True"], explanation: "" },
      { type: "SINGLE", scenario: "", text: "Bad", options: ["A", "B"], correct: ["Z"], explanation: "" },
      { type: "MULTIPLE", scenario: "", text: "Only one", options: ["A", "B"], correct: ["A"], explanation: "" },
      { type: "SINGLE", scenario: "", text: "Dupes", options: ["A", "a"], correct: ["A"], explanation: "" },
    ]);
    expect(rows).toEqual([
      { type: "SINGLE", text: "Pick B", options: "A|B|C", correct: "2", points: "1", scenario: undefined, explanation: "Because" },
      { type: "MULTIPLE", text: "Pick two", options: "A|B|C", correct: "1|3", points: "1", scenario: "At a site", explanation: undefined },
      { type: "TRUE_FALSE", text: "Sky is blue", options: "True|False", correct: "1", points: "1", scenario: undefined, explanation: undefined },
    ]);
    expect(skipped).toHaveLength(3);
    expect(skipped[0]).toContain("Question 4");
  });

  it("tidies lesson text and sources", () => {
    expect(tidyLessonBody("# Title\r\n\r\n\r\n### Sub\n<b>x</b>")).toBe("## Title\n\n## Sub\nx");
    expect(cleanSources([
      { title: "GST portal", url: "https://www.gst.gov.in/" },
      { title: "dup", url: "https://www.gst.gov.in/" },
      { title: "http only", url: "http://example.com" },
      { title: "", url: "https://x.example" },
    ])).toEqual([{ title: "GST portal", url: "https://www.gst.gov.in/" }]);
  });

  it("reads reference files: text, Word, PDF; refuses disguised files", async () => {
    const txt = await readSourceMaterial("notes.txt", Buffer.from("Our escalation matrix"));
    expect(txt).toMatchObject({ ok: true, source: { kind: "text", text: "Our escalation matrix" } });
    const word = await readSourceMaterial("q.docx", await questionsWordExample());
    expect(word.ok && word.source.kind === "text" && word.source.text.length > 50).toBe(true);
    const pdf = await readSourceMaterial("C:\\docs\\policy.pdf", Buffer.from("%PDF-1.4\n..."));
    expect(pdf).toMatchObject({ ok: true, source: { kind: "pdf", name: "policy.pdf" } });
    expect(await readSourceMaterial("fake.pdf", Buffer.from("hello"))).toMatchObject({ ok: false });
    expect(await readSourceMaterial("x.exe", Buffer.from("MZ"))).toMatchObject({ ok: false });
    // A PDF goes to Claude as a document block, ahead of the instructions.
    if (pdf.ok) {
      const content = coursePrompt({ topic: "t", subject: "s", level: "BASIC", audience: "", modules: 1, lessonsPerModule: 1, questions: 0, notes: "" }, pdf.source);
      expect(content.map((b) => b.type)).toEqual(["document", "text"]);
    }
  });
});

describe("AI drafts", () => {
  const tag = `ai-${Date.now()}`;
  const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
  let subjectId: string;

  beforeAll(async () => {
    admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
    admin.email = `${tag}@example.test`;
    subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "TECHNICAL" } })).id;
  });
  afterEach(() => useAiGenerator(null));
  afterAll(async () => {
    await prisma.aiDraft.deleteMany({ where: { createdById: admin.id } });
    await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
    await prisma.assessment.deleteMany({ where: { subjectId } });
    await prisma.course.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    await prisma.user.delete({ where: { id: admin.id } });
    await prisma.$disconnect();
  });

  it("refuses when the AI is switched off", async () => {
    const r = await requestCourseDraft(admin, { topic: "x", subjectId, level: "BASIC", audience: "", modules: 1, lessonsPerModule: 1, questions: 0, notes: "" }, null);
    expect(r).toMatchObject({ ok: false });
  });

  it("drafts a course in the background, then creates it as an unpublished course after review", async () => {
    const seen: AiRequest<unknown>[] = [];
    const course: CourseDraft = {
      title: `${tag} Outage handling`, description: "Handle Sev 1 outages.",
      modules: [
        { title: "Basics", estimatedMinutes: 25, lessons: [{ title: "What is Sev 1", body: LESSON }, { title: "Roles", body: "# Roles\n\nText" }] },
        { title: "Practice", estimatedMinutes: 15, lessons: [{ title: "Bridge call", body: LESSON }] },
      ],
      questions: [
        { type: "SINGLE", scenario: "A core switch fails", text: "First step?", options: ["Open a bridge", "Wait"], correct: ["Open a bridge"], explanation: "Speed matters" },
        { type: "TRUE_FALSE", scenario: "", text: "Sev 1 needs an RCA", options: ["True", "False"], correct: ["True"], explanation: "" },
        { type: "SINGLE", scenario: "", text: "Dropped by admin", options: ["A", "B"], correct: ["A"], explanation: "" },
      ],
      sources: [{ title: "ITIL", url: "https://www.axelos.com/" }],
      reviewNotes: ["Replace [PLACEHOLDER: escalation matrix]"],
    };
    useAiGenerator(fake(() => course, seen));
    const r = await requestCourseDraft(admin, { topic: "Sev 1 outages", subjectId, level: "INTERMEDIATE", audience: "NOC engineers", modules: 2, lessonsPerModule: 2, questions: 3, notes: "Use our matrix" }, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await aiJobsIdle();
    const draft = await prisma.aiDraft.findUniqueOrThrow({ where: { id: r.id } });
    expect(draft.status).toBe("READY");
    expect(draft.model).toBe("fake-model");
    expect(JSON.stringify(seen[0].content)).toContain("NOC engineers");
    expect(seen[0].system).toContain("## Real-world example");
    const result = draft.result as CourseDraft;
    expect(result.modules[0].lessons[1].body).toBe("## Roles\n\nText");

    // The admin drops the second question and the "Roles" lesson, and edits a title.
    const edited: CourseDraft = { ...result, title: `${tag} Sev 1 outage handling`, modules: [{ ...result.modules[0], lessons: [result.modules[0].lessons[0], { title: "", body: "" }] }, result.modules[1]] };
    const applied = await applyCourseDraft(admin, r.id, edited, { subjectId, level: "INTERMEDIATE", departments: ["NOC"], questionIndexes: [0, 1] });
    expect(applied).toMatchObject({ ok: true, lessons: 2, questions: 2 });
    if (!applied.ok) return;
    const made = await prisma.course.findUniqueOrThrow({ where: { id: applied.courseId }, include: { modules: { orderBy: { position: "asc" }, include: { lessons: true } }, assessments: { include: { questions: true } } } });
    expect(made.title).toBe(`${tag} Sev 1 outage handling`);
    expect(made.status).toBe("DRAFT");
    expect(made.departments).toEqual(["NOC"]);
    expect(made.modules.map((m) => [m.title, m.lessons.length])).toEqual([["Basics", 1], ["Practice", 1]]);
    expect(made.sources).toEqual([{ title: "ITIL", url: "https://www.axelos.com/" }]);
    expect(made.assessments[0].questions).toHaveLength(2);
    expect((await prisma.aiDraft.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("APPLIED");
    // Applying twice does not create a second course.
    expect(await applyCourseDraft(admin, r.id, edited, { subjectId, level: "BASIC", departments: [], questionIndexes: [] })).toMatchObject({ ok: false });
    expect(await prisma.auditEvent.count({ where: { actorId: admin.id, action: "ai.apply", entityId: r.id } })).toBe(1);
  });

  it("rewrites a text lesson only when the admin saves it, keeping the old text in the audit log", async () => {
    const courseId = (await prisma.course.create({ data: { subjectId, title: `${tag} c2`, level: "BASIC", passMarkPercent: 70 } })).id;
    const lessonId = (await addLesson(admin, courseId, { title: "Old", type: "TEXT", body: "Old text" }) as { id: string }).id;
    const seen: AiRequest<unknown>[] = [];
    useAiGenerator(fake(() => ({ title: "New", body: LESSON, changes: ["Added key terms"], reviewNotes: [] }) satisfies LessonDraft, seen));
    const r = await requestLessonDraft(admin, lessonId, "Add key terms", null);
    if (!r.ok) throw new Error(r.error);
    await aiJobsIdle();
    expect(JSON.stringify(seen[0].content)).toContain("Old text");
    expect((await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } })).body).toBe("Old text");
    const applied = await applyLessonDraft(admin, r.id, { title: "New title", body: LESSON + "\n\nEdited by admin." });
    expect(applied).toMatchObject({ ok: true, courseId });
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(lesson.title).toBe("New title");
    expect(lesson.body).toContain("Edited by admin.");
    const audit = await prisma.auditEvent.findFirstOrThrow({ where: { action: "lesson.edit", entityId: lessonId } });
    expect(audit.before).toMatchObject({ body: "Old text" });
  });

  it("writes questions for a course and adds the ticked ones to its completion check", async () => {
    const courseId = (await prisma.course.create({ data: { subjectId, title: `${tag} c3`, level: "BASIC", passMarkPercent: 70 } })).id;
    await addLesson(admin, courseId, { title: "L1", type: "TEXT", body: LESSON });
    const qs: QuestionsDraft = {
      questions: [
        { type: "SINGLE", scenario: "", text: "Q1", options: ["A", "B"], correct: ["A"], explanation: "" },
        { type: "SINGLE", scenario: "", text: "Q2", options: ["A", "B"], correct: ["B"], explanation: "" },
      ],
      reviewNotes: [],
    };
    useAiGenerator(fake(() => qs));
    const r = await requestQuestionsDraft(admin, courseId, 2, "", null);
    if (!r.ok) throw new Error(r.error);
    await aiJobsIdle();
    const applied = await applyQuestionsDraft(admin, r.id, [qs.questions[1]]);
    expect(applied).toMatchObject({ ok: true, created: 1 });
    const a = await prisma.assessment.findFirstOrThrow({ where: { courseId }, include: { questions: true } });
    expect(a.published).toBe(true);
    expect(a.questions.map((q) => q.text)).toEqual(["Q2"]);
  });

  it("records a failure with a readable reason, and stale drafts become failed", async () => {
    useAiGenerator(fake(() => new AiError("The AI service is busy")));
    const courseId = (await prisma.course.create({ data: { subjectId, title: `${tag} c4`, level: "BASIC", passMarkPercent: 70 } })).id;
    expect(await requestQuestionsDraft(admin, courseId, 5, "", null)).toMatchObject({ ok: false }); // no lessons, no reference file
    await addLesson(admin, courseId, { title: "L", type: "TEXT", body: "x" });
    const r = await requestQuestionsDraft(admin, courseId, 5, "", null);
    if (!r.ok) throw new Error(r.error);
    await aiJobsIdle();
    expect(await prisma.aiDraft.findUniqueOrThrow({ where: { id: r.id } })).toMatchObject({ status: "FAILED", error: "The AI service is busy" });
    expect(await applyQuestionsDraft(admin, r.id, [])).toMatchObject({ ok: false });
    expect(await discardDraft(admin, r.id)).toEqual({ ok: true });

    const stuck = await prisma.aiDraft.create({ data: { kind: "COURSE", title: "stuck", request: {}, createdById: admin.id } });
    await failStaleDrafts(new Date(Date.now() + 60 * 60_000));
    expect((await prisma.aiDraft.findUniqueOrThrow({ where: { id: stuck.id } })).status).toBe("FAILED");
  });
});
