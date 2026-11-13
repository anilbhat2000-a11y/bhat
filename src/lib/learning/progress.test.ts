import { it, expect } from "vitest";
import { courseProgressPercent } from "./progress";

it("counts only completed lessons that belong to the course", () => {
  expect(courseProgressPercent(4, ["a", "x"], ["a", "b", "c", "d"])).toBe(25);
});

it("rounds to a whole percent", () => {
  expect(courseProgressPercent(3, ["a"], ["a", "b", "c"])).toBe(33);
});

it("is 0 for a course with no lessons", () => {
  expect(courseProgressPercent(0, [], [])).toBe(0);
});
