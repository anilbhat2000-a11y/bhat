import { it, expect } from "vitest";
import { canViewUser, requireRole, AuthError } from "./guards";
import type { SessionUser } from "./session";

const users = [
  { id: "admin", managerId: null },
  { id: "mgr", managerId: "admin" },
  { id: "report", managerId: "mgr" },
  { id: "indirect", managerId: "report" },
  { id: "peer", managerId: "admin" },
  { id: "emp", managerId: "mgr" },
];

const asUser = (id: string, role: SessionUser["role"]): SessionUser => ({
  id, role, active: true, name: id, email: `${id}@example.test`, department: null,
});

it("admins can view any user", () => {
  expect(canViewUser({ id: "admin", role: "ADMIN" }, "indirect", users)).toBe(true);
});

it("employees can view only themselves", () => {
  expect(canViewUser({ id: "emp", role: "EMPLOYEE" }, "emp", users)).toBe(true);
  expect(canViewUser({ id: "emp", role: "EMPLOYEE" }, "peer", users)).toBe(false);
});

it("managers can view indirect reports but not peers", () => {
  expect(canViewUser({ id: "mgr", role: "MANAGER" }, "indirect", users)).toBe(true);
  expect(canViewUser({ id: "mgr", role: "MANAGER" }, "peer", users)).toBe(false);
});

it("requireRole throws 401 when there is no user", () => {
  try { requireRole(null, ["ADMIN"]); expect.unreachable(); }
  catch (e) { expect(e).toBeInstanceOf(AuthError); expect((e as AuthError).status).toBe(401); }
});

it("requireRole throws 403 when the role is not allowed", () => {
  try { requireRole(asUser("emp", "EMPLOYEE"), ["ADMIN"]); expect.unreachable(); }
  catch (e) { expect((e as AuthError).status).toBe(403); }
});

it("requireRole returns the user when the role is allowed", () => {
  const u = asUser("admin", "ADMIN");
  expect(requireRole(u, ["ADMIN", "MANAGER"])).toBe(u);
});
