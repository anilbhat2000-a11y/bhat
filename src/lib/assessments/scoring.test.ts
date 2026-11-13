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

it("accepts any listed fill-in-the-blank answer, ignoring case and extra spaces", () => {
  const q: ScoringQuestion = { id: "f", type: "FILL_BLANK", correctOptionIds: ["o1", "o2"], points: 1,
    options: [{ id: "o1", label: "Router" }, { id: "o2", label: "layer 3 switch" }] };
  expect(isCorrect(q, ["  router "])).toBe(true);
  expect(isCorrect(q, ["Layer   3 Switch"])).toBe(true);
  expect(isCorrect(q, ["switch"])).toBe(false);
  expect(isCorrect(q, [""])).toBe(false);
  expect(isCorrect(q, [])).toBe(false);
});

it("marks matching correct only when every left item is paired with its own right item", () => {
  const q: ScoringQuestion = { id: "m", type: "MATCHING", correctOptionIds: ["o1", "o2"], points: 2,
    options: [{ id: "o1", label: "Switch", match: "L2" }, { id: "o2", label: "Router", match: "L3" }] };
  expect(isCorrect(q, ["o1=o1", "o2=o2"])).toBe(true);
  expect(isCorrect(q, ["o2=o2", "o1=o1"])).toBe(true);
  expect(isCorrect(q, ["o1=o2", "o2=o1"])).toBe(false);
  expect(isCorrect(q, ["o1=o1"])).toBe(false);
  expect(isCorrect(q, ["o1=o1", "o2=o2", "o1=o1"])).toBe(false);
});

it("leaves the score pending until every short answer is marked, then includes the marks", () => {
  const mixed: ScoringQuestion[] = [
    { id: "q1", type: "SINGLE", correctOptionIds: ["o1"], points: 2 },
    { id: "s1", type: "SHORT_ANSWER", correctOptionIds: [], points: 8 },
  ];
  const pending = scoreAttempt(mixed, { q1: ["o1"], s1: ["my answer"] }, 50);
  expect(pending).toMatchObject({ scorePercent: null, passed: null, pendingManual: ["s1"] });

  const graded = scoreAttempt(mixed, { q1: ["o1"], s1: ["my answer"] }, 50, { s1: 4 });
  expect(graded).toMatchObject({ scorePercent: 60, passed: true, pendingManual: [] });

  // A mark above the question's points is capped.
  expect(scoreAttempt(mixed, {}, 50, { s1: 99 }).scorePercent).toBe(80);
});
