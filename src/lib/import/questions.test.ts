import { it, expect } from "vitest";
import { parseQuestionRows, type QuestionRow } from "./questions";

const single: QuestionRow = { type: "SINGLE", text: "Pick B", options: "A|B|C", correct: "2", points: "1" };

it("parses a valid single-choice row, with option ids o1..oN", () => {
  const r = parseQuestionRows([single]);
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.questions[0]).toEqual({
      type: "SINGLE",
      text: "Pick B",
      options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }, { id: "o3", label: "C" }],
      correctOptionIds: ["o2"],
      points: 1,
    });
  }
});

it("parses a multiple-choice row with several correct indexes", () => {
  const r = parseQuestionRows([{ type: "MULTIPLE", text: "Pick two", options: "A|B|C", correct: "1|3", points: "2" }]);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.questions[0].correctOptionIds).toEqual(["o1", "o3"]);
});

it("reports an out-of-range correct index with its row number", () => {
  const r = parseQuestionRows([single, { ...single, correct: "5" }]);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.errors).toEqual([expect.objectContaining({ row: 2 })]);
});

it("a file with one bad row returns no questions at all (all-or-nothing)", () => {
  const r = parseQuestionRows([single, { type: "SINGLE", text: "", options: "A|B", correct: "1", points: "1" }]);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
});

it("single choice needs exactly one correct index; multiple needs at least two", () => {
  expect(parseQuestionRows([{ ...single, correct: "1|2" }]).ok).toBe(false);
  expect(parseQuestionRows([{ type: "MULTIPLE", text: "x", options: "A|B|C", correct: "1", points: "1" }]).ok).toBe(false);
});

it("true/false needs the options True|False", () => {
  expect(parseQuestionRows([{ type: "TRUE_FALSE", text: "x", options: "True|False", correct: "1", points: "1" }]).ok).toBe(true);
  expect(parseQuestionRows([{ type: "TRUE_FALSE", text: "x", options: "Yes|No", correct: "1", points: "1" }]).ok).toBe(false);
});

it("points must be a positive integer", () => {
  expect(parseQuestionRows([{ ...single, points: "0" }]).ok).toBe(false);
  expect(parseQuestionRows([{ ...single, points: "1.5" }]).ok).toBe(false);
});
