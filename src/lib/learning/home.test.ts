import { it, expect } from "vitest";
import { dueSummary } from "./home";

const now = new Date("2026-11-13T10:00:00Z");

it("counts an open weekly period due this week in thisWeek", () => {
  const s = dueSummary(
    [{ cadence: "WEEKLY", status: "OPEN", dueAt: new Date("2026-11-15T23:59:59.999Z") }],
    now,
  );
  expect(s.thisWeek).toBe(1);
  expect(s.thisMonth).toBe(0);
});

it("an overdue period counts in overdue only", () => {
  const s = dueSummary([{ cadence: "MONTHLY", status: "OVERDUE", dueAt: new Date("2026-11-01T00:00:00Z") }], now);
  expect(s.overdue).toBe(1);
  expect(s.thisMonth).toBe(0);
});

it("a passed period is not due", () => {
  const s = dueSummary([{ cadence: "ANNUAL", status: "PASSED", dueAt: new Date("2026-12-31T23:59:59Z") }], now);
  expect(s.thisYear).toBe(0);
  expect(s.overdue).toBe(0);
});

it("an open period whose due time has already passed is not counted as due", () => {
  const s = dueSummary([{ cadence: "WEEKLY", status: "OPEN", dueAt: new Date("2026-11-12T00:00:00Z") }], now);
  expect(s.thisWeek).toBe(0);
});
