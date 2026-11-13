import { it, expect } from "vitest";
import { remainingSeconds } from "./time";

it("counts whole seconds left, never below zero", () => {
  const end = new Date("2030-01-01T10:30:00Z");
  expect(remainingSeconds(end, new Date("2030-01-01T10:00:00Z"))).toBe(1800);
  expect(remainingSeconds(end, new Date("2030-01-01T10:29:59.500Z"))).toBe(1);
  expect(remainingSeconds(end, new Date("2030-01-01T11:00:00Z"))).toBe(0);
});
