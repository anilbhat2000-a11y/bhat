import type { QuestionType } from "../../generated/prisma/client";

export type ScoringQuestion = {
  id: string;
  type: QuestionType;
  correctOptionIds: string[];
  points: number;
  // Needed for FILL_BLANK (accepted answers) and MATCHING (the pairs).
  options?: { id: string; label: string; match?: string }[];
};

export const isManual = (type: QuestionType) => type === "SHORT_ANSWER";

// Case, surrounding spaces, and repeated spaces do not matter in typed answers.
export function normaliseText(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

// How each type is answered (the values of answers[questionId]):
//   SINGLE, TRUE_FALSE: [optionId]        MULTIPLE: [optionId, ...]
//   FILL_BLANK: [typed text]              MATCHING: ["leftId=rightId", ...]
//   SHORT_ANSWER: [typed text], marked by a reviewer, never here.
// Duplicates in a selection make the answer wrong.
export function isCorrect(q: ScoringQuestion, selected: string[]): boolean {
  if (new Set(selected).size !== selected.length) return false;
  switch (q.type) {
    case "SHORT_ANSWER":
      return false;
    case "FILL_BLANK": {
      if (selected.length !== 1) return false;
      const typed = normaliseText(selected[0]);
      return typed.length > 0 && (q.options ?? []).some((o) => normaliseText(o.label) === typed);
    }
    case "MATCHING": {
      // Each left item must be paired with its own right item, and nothing else.
      const ids = (q.options ?? []).map((o) => o.id);
      if (selected.length !== ids.length) return false;
      const pairs = new Map(selected.map((s) => s.split("=") as [string, string]));
      return ids.every((id) => pairs.get(id) === id);
    }
    case "MULTIPLE": {
      const correct = new Set(q.correctOptionIds);
      return selected.length === correct.size && selected.every((id) => correct.has(id));
    }
    default:
      return selected.length === 1 && q.correctOptionIds.includes(selected[0]);
  }
}

export type Scoring = {
  // Null while short answers are waiting for a reviewer.
  scorePercent: number | null;
  passed: boolean | null;
  perQuestion: Record<string, boolean>;
  pendingManual: string[];
};

// `manual` holds the points a reviewer awarded to each short answer. A short answer with no
// mark leaves the attempt pending. Awarded points are capped at the question's points.
export function scoreAttempt(
  questions: ScoringQuestion[],
  answers: Record<string, string[]>,
  passMarkPercent: number,
  manual: Record<string, number> = {},
): Scoring {
  const total = questions.reduce((sum, q) => sum + q.points, 0);
  const perQuestion: Record<string, boolean> = {};
  const pendingManual: string[] = [];
  let earned = 0;
  for (const q of questions) {
    if (isManual(q.type)) {
      const awarded = manual[q.id];
      if (awarded === undefined) {
        pendingManual.push(q.id);
        continue;
      }
      const capped = Math.max(0, Math.min(q.points, awarded));
      earned += capped;
      perQuestion[q.id] = capped === q.points;
      continue;
    }
    const ok = isCorrect(q, answers[q.id] ?? []);
    perQuestion[q.id] = ok;
    if (ok) earned += q.points;
  }
  if (pendingManual.length > 0) return { scorePercent: null, passed: null, perQuestion, pendingManual };
  const scorePercent = total === 0 ? 0 : Math.round((earned / total) * 10000) / 100;
  return { scorePercent, passed: scorePercent >= passMarkPercent, perQuestion, pendingManual };
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
