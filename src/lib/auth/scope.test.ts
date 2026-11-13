import { it, expect } from "vitest";
import { reportingLineIds } from "./scope";

const users = [
  { id: "a", managerId: null },
  { id: "b", managerId: "a" },
  { id: "c", managerId: "b" },
  { id: "d", managerId: "a" },
];

it("returns direct and indirect reports", () => {
  expect([...reportingLineIds("a", users)].sort()).toEqual(["b", "c", "d"]);
});

it("excludes the manager, and a leaf has no reports", () => {
  expect(reportingLineIds("c", users).size).toBe(0);
});

it("terminates on a manager cycle (Review Focus 5)", () => {
  const cyc = [{ id: "x", managerId: "y" }, { id: "y", managerId: "x" }];
  expect([...reportingLineIds("x", cyc)]).toEqual(["y"]);
});
