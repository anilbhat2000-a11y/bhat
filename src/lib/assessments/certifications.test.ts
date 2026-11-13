import { it, expect } from "vitest";
import { expiresAt, isActive, highestActiveLevelPerSubject } from "./certifications";

it("adds validity months in UTC, rolling 31 Jan + 1 month to 3 Mar", () => {
  expect(expiresAt(new Date("2026-01-31T00:00:00Z"), 1).toISOString()).toBe("2026-03-03T00:00:00.000Z");
});

it("treats expiry at exactly now as expired (Review Focus 1)", () => {
  const t = new Date("2027-01-01T00:00:00Z");
  expect(isActive({ expiresAt: t }, t)).toBe(false);
});

it("returns the highest active level per subject, ignoring expired certificates", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const m = highestActiveLevelPerSubject(
    [
      { subjectId: "s1", level: "BASIC", expiresAt: new Date("2027-01-01T00:00:00Z") },
      { subjectId: "s1", level: "ADVANCED", expiresAt: new Date("2027-01-01T00:00:00Z") },
      { subjectId: "s2", level: "ADVANCED", expiresAt: new Date("2026-01-01T00:00:00Z") },
    ],
    now,
  );
  expect(m.get("s1")).toBe("ADVANCED");
  expect(m.has("s2")).toBe(false);
});
