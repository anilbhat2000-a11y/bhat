import { it, expect } from "vitest";
import { parseRange } from "./range";

it("a start and end range inside the file", () => {
  expect(parseRange("bytes=0-99", 1000)).toEqual({ kind: "partial", start: 0, end: 99 });
});

it("an open-ended range runs to the last byte", () => {
  expect(parseRange("bytes=900-", 1000)).toEqual({ kind: "partial", start: 900, end: 999 });
});

it("a suffix range takes the last N bytes", () => {
  expect(parseRange("bytes=-100", 1000)).toEqual({ kind: "partial", start: 900, end: 999 });
});

it("an end past the file is clipped to the last byte", () => {
  expect(parseRange("bytes=500-5000", 1000)).toEqual({ kind: "partial", start: 500, end: 999 });
});

it("a start past the end is unsatisfiable", () => {
  expect(parseRange("bytes=2000-3000", 1000)).toEqual({ kind: "unsatisfiable" });
});

it("no header or a malformed header means the whole file", () => {
  expect(parseRange(null, 1000)).toEqual({ kind: "full" });
  expect(parseRange("items=0-1", 1000)).toEqual({ kind: "full" });
});
