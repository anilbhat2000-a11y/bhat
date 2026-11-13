import { it, expect } from "vitest";
import { periodKeyFor, periodBounds, nextPeriodKey } from "./periods";

it("weekly uses ISO week, including the year boundary", () => {
  expect(periodKeyFor("WEEKLY", new Date("2026-11-12T00:00:00Z"))).toBe("2026-W46");
  expect(periodKeyFor("WEEKLY", new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
});

it("2026 has ISO week 53, and Dec 31 2026 falls in it", () => {
  expect(periodKeyFor("WEEKLY", new Date("2026-12-31T12:00:00Z"))).toBe("2026-W53");
});

it("monthly and annual keys", () => {
  expect(periodKeyFor("MONTHLY", new Date("2026-11-30T23:59:59Z"))).toBe("2026-11");
  expect(periodKeyFor("ANNUAL", new Date("2026-06-01T00:00:00Z"))).toBe("2026");
});

it("ONE_TIME uses a single fixed key", () => {
  expect(periodKeyFor("ONE_TIME", new Date("2026-06-01T00:00:00Z"))).toBe("ONCE");
});

it("monthly due time is the last millisecond of the month", () => {
  expect(periodBounds("MONTHLY", "2026-02").dueAt.toISOString()).toBe("2026-02-28T23:59:59.999Z");
});

it("weekly period runs Monday 00:00 UTC to the next Monday minus 1 ms", () => {
  const b = periodBounds("WEEKLY", "2026-W46");
  expect(b.opensAt.toISOString()).toBe("2026-11-09T00:00:00.000Z");
  expect(b.dueAt.toISOString()).toBe("2026-11-15T23:59:59.999Z");
});

it("annual period ends at the end of the calendar year", () => {
  expect(periodBounds("ANNUAL", "2026").dueAt.toISOString()).toBe("2026-12-31T23:59:59.999Z");
});

it("ONE_TIME period is open-ended", () => {
  const b = periodBounds("ONE_TIME", "ONCE");
  expect(b.opensAt.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  expect(b.dueAt.toISOString()).toBe("9999-12-31T23:59:59.999Z");
});

it("next key rolls over the year for months and for ISO week 53", () => {
  expect(nextPeriodKey("MONTHLY", "2026-12")).toBe("2027-01");
  expect(nextPeriodKey("WEEKLY", "2026-W53")).toBe("2027-W01");
  expect(nextPeriodKey("WEEKLY", "2026-W46")).toBe("2026-W47");
  expect(nextPeriodKey("ANNUAL", "2026")).toBe("2027");
});
