import { it, expect } from "vitest";
import { parseUserRows, type UserRow } from "./users";

const alice: UserRow = { name: "Alice", email: "alice@example.test", role: "EMPLOYEE", department: "Sales", managerEmail: "" };

it("parses a valid user row", () => {
  const r = parseUserRows([alice], new Set());
  expect(r.ok).toBe(true);
});

it("rejects a duplicate email within the file", () => {
  const r = parseUserRows([alice, { ...alice, name: "Alice again" }], new Set());
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.errors).toEqual([expect.objectContaining({ row: 2 })]);
});

it("rejects an invalid email, an unknown role, and an unknown manager", () => {
  expect(parseUserRows([{ ...alice, email: "not-an-email" }], new Set()).ok).toBe(false);
  expect(parseUserRows([{ ...alice, role: "CEO" }], new Set()).ok).toBe(false);
  expect(parseUserRows([{ ...alice, managerEmail: "ghost@example.test" }], new Set()).ok).toBe(false);
});

it("accepts a manager who is in the file or already known", () => {
  const mgr: UserRow = { name: "Manager", email: "mgr@example.test", role: "MANAGER", department: "Sales", managerEmail: "" };
  expect(parseUserRows([mgr, { ...alice, managerEmail: "mgr@example.test" }], new Set()).ok).toBe(true);
  expect(parseUserRows([{ ...alice, managerEmail: "boss@example.test" }], new Set(["boss@example.test"])).ok).toBe(true);
});
