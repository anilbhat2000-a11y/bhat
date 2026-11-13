import type { QuestionType } from "../../generated/prisma/client";

export type ScoringQuestion = {
  id: string;
  type: QuestionType;
  correctOptionIds: string[];
  points: number;
};

// Single choice and true/false: exactly one selected option, and it is the correct one.
// Multiple choice: the selected set equals the correct set, ignoring order.
// Duplicates in the selection make the answer wrong.
export function isCorrect(q: ScoringQuestion, selected: string[]): boolean {
  if (new Set(selected).size !== selected.length) return false;
  const correct = new Set(q.correctOptionIds);
  if (q.type === "MULTIPLE") {
    return selected.length === correct.size && selected.every((id) => correct.has(id));
  }
  return selected.length === 1 && correct.has(selected[0]);
}

export function scoreAttempt(
  questions: ScoringQuestion[],
  answers: Record<string, string[]>,
  passMarkPercent: number,
): { scorePercent: number; passed: boolean; perQuestion: Record<string, boolean> } {
  const total = questions.reduce((sum, q) => sum + q.points, 0);
  const perQuestion: Record<string, boolean> = {};
  let earned = 0;
  for (const q of questions) {
    const ok = isCorrect(q, answers[q.id] ?? []);
    perQuestion[q.id] = ok;
    if (ok) earned += q.points;
  }
  const scorePercent = total === 0 ? 0 : Math.round((earned / total) * 10000) / 100;
  return { scorePercent, passed: scorePercent >= passMarkPercent, perQuestion };
}

// Fisher-Yates on a copy. Callers pass an injected rng in tests.
export function shuffleOptions<T>(options: T[], rng: () => number = Math.random): T[] {
  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
