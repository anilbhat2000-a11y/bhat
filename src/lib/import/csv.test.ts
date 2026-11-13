import { it, expect } from "vitest";
import { parseCsvRows } from "./csv";

it("maps the header row to each record", () => {
  const rows = parseCsvRows("name,email\r\nAlice,a@example.test\r\n");
  expect(rows).toEqual([{ name: "Alice", email: "a@example.test" }]);
});

it("handles quoted fields with commas and doubled quotes", () => {
  const rows = parseCsvRows('name,department\n"Rao, Priya","Sales ""East"""\n');
  expect(rows[0]).toEqual({ name: "Rao, Priya", department: 'Sales "East"' });
});

it("returns no records for a header-only file", () => {
  expect(parseCsvRows("name,email\n")).toEqual([]);
});
