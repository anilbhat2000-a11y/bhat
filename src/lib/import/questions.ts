import type { QuestionType } from "../../generated/prisma/client";

// One question as typed in the admin form or a CSV row.
//   options: "|"-separated. For FILL_BLANK, the accepted answers. For MATCHING, pairs
//            written "left=right". Empty for SHORT_ANSWER.
//   correct: "|"-separated option numbers (1-based). Empty for FILL_BLANK, MATCHING and
//            SHORT_ANSWER, whose answers are defined by the options themselves.
export type QuestionRow = {
  type: string;
  text: string;
  options: string;
  correct: string;
  points: string;
  scenario?: string;
  explanation?: string;
};
export type QuestionOption = { id: string; label: string; match?: string };
export type ParsedQuestion = {
  type: QuestionType;
  text: string;
  options: QuestionOption[];
  correctOptionIds: string[];
  points: number;
  scenario: string | null;
  explanation: string | null;
};
export type RowError = { row: number; reason: string };

export const QUESTION_TYPES: QuestionType[] = ["SINGLE", "MULTIPLE", "TRUE_FALSE", "FILL_BLANK", "MATCHING", "SHORT_ANSWER"];

const split = (s: string) => s.split("|").map((x) => x.trim()).filter((x) => x.length > 0);

// Collects every error across all rows. If any row fails, no questions are returned.
export function parseQuestionRows(
  rows: QuestionRow[],
): { ok: true; questions: ParsedQuestion[] } | { ok: false; errors: RowError[] } {
  const errors: RowError[] = [];
  const questions: ParsedQuestion[] = [];

  rows.forEach((raw, index) => {
    const row = index + 1;
    const fail = (reason: string) => errors.push({ row, reason });

    const type = raw.type.trim().toUpperCase() as QuestionType;
    if (!QUESTION_TYPES.includes(type)) return fail(`type must be one of ${QUESTION_TYPES.join(", ")}`);
    const text = raw.text.trim();
    if (!text) return fail("question text is required");
    const points = Number(raw.points);
    if (!Number.isInteger(points) || points < 1) return fail("points must be a positive whole number");
    const extras = {
      scenario: raw.scenario?.trim() || null,
      explanation: raw.explanation?.trim() || null,
    };
    const labels = split(raw.options);

    if (type === "SHORT_ANSWER") {
      if (labels.length > 0) return fail("short answer questions take no options; put a model answer in the explanation");
      questions.push({ type, text, options: [], correctOptionIds: [], points, ...extras });
      return;
    }

    if (type === "FILL_BLANK") {
      if (labels.length < 1 || labels.length > 10) return fail("fill-in-the-blank needs 1 to 10 accepted answers");
      const options = labels.map((label, i) => ({ id: `o${i + 1}`, label }));
      questions.push({ type, text, options, correctOptionIds: options.map((o) => o.id), points, ...extras });
      return;
    }

    if (type === "MATCHING") {
      const pairs = labels.map((p) => p.split("=").map((x) => x.trim()));
      if (pairs.length < 2 || pairs.length > 8) return fail("matching needs 2 to 8 pairs written left=right");
      if (pairs.some((p) => p.length !== 2 || !p[0] || !p[1])) return fail("each matching pair must be written left=right");
      if (new Set(pairs.map((p) => p[1].toLowerCase())).size !== pairs.length) {
        return fail("each right-hand item in a matching question must be different");
      }
      const options = pairs.map(([label, match], i) => ({ id: `o${i + 1}`, label, match }));
      questions.push({ type, text, options, correctOptionIds: options.map((o) => o.id), points, ...extras });
      return;
    }

    if (type === "TRUE_FALSE") {
      if (labels.length !== 2 || labels[0] !== "True" || labels[1] !== "False") {
        return fail("true/false options must be exactly True|False");
      }
    } else if (labels.length < 2 || labels.length > 6) {
      return fail("single and multiple choice need 2 to 6 options");
    }

    const numbers = split(raw.correct).map(Number);
    if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > labels.length)) {
      return fail(`correct answer must be option numbers between 1 and ${labels.length}`);
    }
    const unique = Array.from(new Set(numbers));
    if (type !== "MULTIPLE" && unique.length !== 1) return fail("this question type needs exactly one correct option");
    if (type === "MULTIPLE" && unique.length < 2) return fail("multiple choice needs at least two correct options");

    questions.push({
      type,
      text,
      options: labels.map((label, i) => ({ id: `o${i + 1}`, label })),
      correctOptionIds: unique.map((n) => `o${n}`),
      points,
      ...extras,
    });
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, questions };
}
