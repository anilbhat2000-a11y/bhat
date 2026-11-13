import { it, expect } from "vitest";
import { canStartAttempt, isWithinTimeLimit } from "./attempts";

it("allows a start below the attempt limit in an open period", () => {
  expect(canStartAttempt(0, 3, "OPEN")).toBe(true);
  expect(canStartAttempt(2, 3, "OPEN")).toBe(true);
});

it("refuses a start at the attempt limit", () => {
  expect(canStartAttempt(3, 3, "OPEN")).toBe(false);
});

it("refuses a start in a passed or overdue period", () => {
  expect(canStartAttempt(0, 3, "PASSED")).toBe(false);
  expect(canStartAttempt(0, 3, "OVERDUE")).toBe(false);
});

it("accepts a submit exactly at the time limit and refuses one millisecond later", () => {
  const started = new Date("2026-11-13T10:00:00Z");
  expect(isWithinTimeLimit(started, new Date("2026-11-13T10:30:00Z"), 30)).toBe(true);
  expect(isWithinTimeLimit(started, new Date("2026-11-13T10:30:00.001Z"), 30)).toBe(false);
});

it("has no time limit when the limit is null", () => {
  expect(isWithinTimeLimit(new Date(0), new Date("2099-01-01T00:00:00Z"), null)).toBe(true);
});
