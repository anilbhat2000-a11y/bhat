import { it, expect } from "vitest";
import { scoreAttempt, isCorrect, shuffleOptions, type ScoringQuestion } from "./scoring";

const qs: ScoringQuestion[] = [
  { id: "q1", type: "SINGLE", correctOptionIds: ["o2"], points: 1 },
  { id: "q2", type: "MULTIPLE", correctOptionIds: ["o1", "o3"], points: 2 },
];

it("scores by points and passes at the mark", () => {
  const r = scoreAttempt(qs, { q1: ["o2"], q2: ["o1", "o3"] }, 100);
  expect(r.scorePercent).toBe(100);
  expect(r.passed).toBe(true);
});

it("scores partially by points, rounded to 2 decimals", () => {
  const r = scoreAttempt(qs, { q1: ["o2"] }, 50);
  expect(r.scorePercent).toBe(33.33);
  expect(r.passed).toBe(false);
  expect(r.perQuestion).toEqual({ q1: true, q2: false });
});

it("multiple choice needs an exact set, order-insensitive, no duplicates", () => {
  expect(isCorrect(qs[1], ["o1"])).toBe(false);
  expect(isCorrect(qs[1], ["o3", "o1"])).toBe(true);
  expect(isCorrect(qs[1], ["o1", "o1", "o3"])).toBe(false);
});

it("an empty multiple-choice selection scores 0 without error (Review Focus 4)", () => {
  const r = scoreAttempt([qs[1]], {}, 50);
  expect(r.scorePercent).toBe(0);
  expect(r.passed).toBe(false);
});

it("zero total points scores 0 without dividing by zero", () => {
  const r = scoreAttempt([{ id: "z", type: "SINGLE", correctOptionIds: ["a"], points: 0 }], {}, 50);
  expect(r.scorePercent).toBe(0);
});

it("shuffle returns a permutation and does not mutate its input", () => {
  const input = ["a", "b", "c", "d"];
  const out = shuffleOptions(input, () => 0.5);
  expect([...out].sort()).toEqual(["a", "b", "c", "d"]);
  expect(input).toEqual(["a", "b", "c", "d"]);
});
