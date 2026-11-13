import type { QuestionType } from "../../generated/prisma/client";

export type QuestionRow = { type: string; text: string; options: string; correct: string; points: string };
export type ParsedQuestion = {
  type: QuestionType;
  text: string;
  options: { id: string; label: string }[];
  correctOptionIds: string[];
  points: number;
};
export type RowError = { row: number; reason: string };

const TYPES: QuestionType[] = ["SINGLE", "MULTIPLE", "TRUE_FALSE"];

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
    if (!TYPES.includes(type)) return fail(`type must be one of ${TYPES.join(", ")}`);
    const text = raw.text.trim();
    if (!text) return fail("question text is required");

    const labels = raw.options.split("|").map((s) => s.trim()).filter((s) => s.length > 0);
    if (type === "TRUE_FALSE") {
      if (labels.length !== 2 || labels[0] !== "True" || labels[1] !== "False") {
        return fail("true/false options must be exactly True|False");
      }
    } else if (labels.length < 2 || labels.length > 6) {
      return fail("single and multiple choice need 2 to 6 options");
    }

    const indexes = raw.correct.split("|").map((s) => s.trim()).filter((s) => s.length > 0);
    const numbers = indexes.map(Number);
    if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > labels.length)) {
      return fail(`correct answer must be option numbers between 1 and ${labels.length}`);
    }
    const unique = Array.from(new Set(numbers));
    if (type !== "MULTIPLE" && unique.length !== 1) return fail("this question type needs exactly one correct option");
    if (type === "MULTIPLE" && unique.length < 2) return fail("multiple choice needs at least two correct options");

    const points = Number(raw.points);
    if (!Number.isInteger(points) || points < 1) return fail("points must be a positive whole number");

    questions.push({
      type,
      text,
      options: labels.map((label, i) => ({ id: `o${i + 1}`, label })),
      correctOptionIds: unique.map((n) => `o${n}`),
      points,
    });
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, questions };
}
