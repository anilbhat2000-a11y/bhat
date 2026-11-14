import { z } from "zod";
import { LEGAL_NAME } from "../brand";
import type { AiContent } from "./engine";
import type { SourceMaterial } from "./source";
import type { QuestionRow } from "../import/questions";

// What the AI assistant writes, and how it is asked to write it. Every lesson follows the
// portal's house style, so AI lessons read like the rest of the catalogue.

const Question = z.object({
  type: z.enum(["SINGLE", "MULTIPLE", "TRUE_FALSE"]).describe("SINGLE: one correct option. MULTIPLE: two or more. TRUE_FALSE: options are exactly True and False."),
  scenario: z.string().describe("A short workplace situation shown above the question, or an empty string"),
  text: z.string(),
  options: z.array(z.string()).describe("2 to 6 answer options, each different. For TRUE_FALSE exactly [\"True\", \"False\"]."),
  correct: z.array(z.string()).describe("The correct options, copied exactly from options"),
  explanation: z.string().describe("One or two sentences: why the answer is right, shown after the attempt"),
});
export type AiQuestion = z.infer<typeof Question>;

const Source = z.object({ title: z.string(), url: z.string().describe("An https address of an official page") });
const ReviewNotes = z.array(z.string()).describe("Things the administrator must check or fill in before publishing: [PLACEHOLDER] items, facts that change often, anything uncertain");

export const CourseDraftSchema = z.object({
  title: z.string(),
  description: z.string().describe("One or two sentences for the catalogue"),
  modules: z.array(z.object({
    title: z.string(),
    estimatedMinutes: z.number().describe("Whole minutes to study the module"),
    lessons: z.array(z.object({ title: z.string(), body: z.string().describe("The lesson in the portal's Markdown subset") })),
  })),
  questions: z.array(Question),
  sources: z.array(Source),
  reviewNotes: ReviewNotes,
});
export type CourseDraft = z.infer<typeof CourseDraftSchema>;

export const LessonDraftSchema = z.object({
  title: z.string(),
  body: z.string(),
  changes: z.array(z.string()).describe("What was changed and why, one short line each"),
  reviewNotes: ReviewNotes,
});
export type LessonDraft = z.infer<typeof LessonDraftSchema>;

export const QuestionsDraftSchema = z.object({ questions: z.array(Question), reviewNotes: ReviewNotes });
export type QuestionsDraft = z.infer<typeof QuestionsDraftSchema>;

export const SYSTEM_PROMPT = `You write training content for the in-house learning portal of ${LEGAL_NAME}, an Indian IT, system-integration and telecom company. Learners are employees: engineers, sales, accounts, HR and support staff. Many read English as a second language.

Writing rules:
- Plain, easy English. Short sentences and paragraphs. Explain every technical term the first time it appears. Correct grammar and spelling (Indian/British spelling is fine).
- Accurate facts only. When a fact comes from a law, standard or vendor (for example GST rules, ITIL, ISO 27001, a vendor's product), name it. If you are not sure of a figure or a rule that changes often, say what to check instead of guessing, and add it to reviewNotes.
- Never invent company-specific facts (prices, discounts, approval levels, internal policies, partner tiers, customer names). Write [PLACEHOLDER: what goes here] for the administrator to fill in, and list each one in reviewNotes. Customer and person names in examples are fictional.
- Examples are realistic situations in Indian IT and system-integration work.

Every lesson body uses this structure, so learners always know where to look:
1. A short introduction (2 to 4 sentences): what the lesson covers and why it matters at work.
2. Two or three "## " sections that teach the topic, with bullet or numbered lists where they help.
3. "## Key terms": a bullet list, each "- **Term**: meaning".
4. "## Real-world example": one worked situation, step by step.
5. "## Common mistakes": a bullet list of mistakes and how to avoid them.
6. "## Key takeaways": three to five bullets.

Formatting: the portal shows only this Markdown subset. A blank line starts a new paragraph. "- " starts a bullet, "1. " a numbered step, "## " a heading, "> " a highlighted note. **bold**, *italic* and \`code\` work inline. Full https:// addresses become links. Do not use tables, images, HTML, "#" or "###" headings, or nested lists.

Questions test understanding and application, not memory of exact wording. Prefer short workplace scenarios. Options are plausible, similar in length, and never "all of the above" or "none of the above". The correct options are copied exactly from the options list.

Sources: list only official pages you are confident exist (standards bodies, government portals, vendor documentation home pages). Never make up a deep link; a vendor's documentation home page is better than a guessed address. Add a review note reminding the administrator to open each link.`;

export type CourseRequest = {
  topic: string;
  subject: string;
  level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  audience: string;
  modules: number;
  lessonsPerModule: number;
  questions: number;
  notes: string;
};
export type LessonRequest = { courseTitle: string; level: string; lessonTitle: string; body: string; instruction: string };
export type QuestionsRequest = { courseTitle: string; level: string; count: number; notes: string; lessons: { title: string; body: string }[] };

const LEVEL = { BASIC: "Basic (new to the topic)", INTERMEDIATE: "Intermediate (knows the basics)", ADVANCED: "Advanced (experienced practitioners)" } as const;

function withSource(text: string, source: SourceMaterial | null): AiContent {
  if (!source) return [{ type: "text", text }];
  const intro = `Reference material from the company: "${source.name}". Base the content on it. Where it is specific to the company, follow it exactly. Where it is silent, use your general knowledge and say so in reviewNotes.`;
  if (source.kind === "pdf") {
    return [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: source.data.toString("base64") }, title: source.name },
      { type: "text", text: `${intro}\n\n${text}` },
    ];
  }
  return [{ type: "text", text: `${intro}\n\n<reference name="${source.name}">\n${source.text}\n</reference>\n\n${text}` }];
}

export function coursePrompt(r: CourseRequest, source: SourceMaterial | null): AiContent {
  return withSource([
    `Write a complete course for the portal.`,
    `Topic: ${r.topic}`,
    `Subject area in the catalogue: ${r.subject}`,
    `Level: ${LEVEL[r.level]}`,
    `Who it is for: ${r.audience || "all employees"}`,
    `Size: ${r.modules} modules, ${r.lessonsPerModule} lessons in each module. Each lesson takes about 10 to 15 minutes to read (roughly 600 to 900 words). Set each module's estimatedMinutes to match.`,
    r.questions > 0 ? `Completion check: ${r.questions} questions covering every module.` : `Completion check: none (return an empty questions list).`,
    r.notes ? `Instructions from the administrator: ${r.notes}` : "",
  ].filter(Boolean).join("\n"), source);
}

export function lessonPrompt(r: LessonRequest, source: SourceMaterial | null): AiContent {
  return withSource([
    `Rewrite this lesson from the course "${r.courseTitle}" (level: ${r.level}).`,
    `Keep everything that is correct and specific to the company, including [PLACEHOLDER] markers. Fix errors, update facts that are out of date (and note them in reviewNotes), make it clearer, and bring it to the house structure.`,
    r.instruction ? `What the administrator wants changed: ${r.instruction}` : `The administrator gave no extra instructions: improve clarity, accuracy and structure.`,
    ``,
    `Current title: ${r.lessonTitle}`,
    `<current_lesson>\n${r.body || "(empty: write the lesson from the title)"}\n</current_lesson>`,
  ].join("\n"), source);
}

export function questionsPrompt(r: QuestionsRequest, source: SourceMaterial | null): AiContent {
  const lessons = r.lessons.map((l, i) => `<lesson number="${i + 1}" title="${l.title.replace(/"/g, "'")}">\n${l.body}\n</lesson>`).join("\n");
  return withSource([
    `Write ${r.count} completion-check questions for the course "${r.courseTitle}" (level: ${r.level}).`,
    `Test only what the lessons below teach, spread across all of them. Mix single-answer, multiple-answer and true/false questions; most should be single-answer scenarios.`,
    r.notes ? `Instructions from the administrator: ${r.notes}` : "",
    lessons || "(The course has no text lessons; use the reference material and the course title.)",
  ].filter(Boolean).join("\n"), source);
}

// --- Checks on what came back -----------------------------------------------------------

// Turns AI questions into the portal's import format (options "|"-separated, correct answers
// as 1-based option numbers). Questions whose answers do not match their options are skipped
// with a reason, so an admin never imports a broken question.
export function toQuestionRows(questions: AiQuestion[]): { rows: QuestionRow[]; skipped: string[] } {
  const rows: QuestionRow[] = [];
  const skipped: string[] = [];
  questions.forEach((q, i) => {
    const options = q.type === "TRUE_FALSE" ? ["True", "False"] : q.options.map((o) => o.replace(/\|/g, "/").trim()).filter(Boolean);
    const norm = (s: string) => s.replace(/\|/g, "/").trim().toLowerCase();
    const correct = [...new Set(q.correct.map((c) => options.findIndex((o) => o.toLowerCase() === norm(c)) + 1))];
    const label = `Question ${i + 1}`;
    if (!q.text.trim()) skipped.push(`${label}: no question text`);
    else if (options.length < 2) skipped.push(`${label}: fewer than two options`);
    else if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) skipped.push(`${label}: two options are the same`);
    else if (correct.length === 0 || correct.includes(0)) skipped.push(`${label}: the correct answer is not one of the options`);
    else if (q.type !== "MULTIPLE" && correct.length !== 1) skipped.push(`${label}: needs exactly one correct answer`);
    else if (q.type === "MULTIPLE" && correct.length < 2) skipped.push(`${label}: a multiple-answer question needs two or more correct answers`);
    else rows.push({ type: q.type, text: q.text.trim(), options: options.join("|"), correct: correct.join("|"), points: "1", scenario: q.scenario.trim() || undefined, explanation: q.explanation.trim() || undefined });
  });
  return { rows, skipped };
}

// Keeps only well-formed https links, without duplicates.
export function cleanSources(sources: { title: string; url: string }[]): { title: string; url: string }[] {
  const seen = new Set<string>();
  return sources
    .map((s) => ({ title: s.title.trim().slice(0, 200), url: s.url.trim() }))
    .filter((s) => s.title && /^https:\/\/[^\s<>"]+$/i.test(s.url) && !seen.has(s.url) && seen.add(s.url))
    .slice(0, 20);
}

// Lesson text uses a small Markdown subset. Headings the portal does not show ("#", "###")
// become "## ", and stray HTML tags are removed, so the lesson always renders cleanly.
export function tidyLessonBody(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/^#{1,6}\s+/gm, "## ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
