import { describe, it, expect } from "vitest";
import { validateProfileEdit } from "./validate";
import { initialsFor } from "./initials";
import type { SessionUser } from "../auth/session";

const employee: SessionUser = { id: "e1", role: "EMPLOYEE", active: true, name: "E", email: "", department: null };

describe("profile validation", () => {
  it("an employee may edit personal details", () => {
    expect(validateProfileEdit(employee, { phone: "+91 9000000000", bio: "Hello" })).toEqual({ ok: true });
  });

  it("an employee cannot set department or other employment fields (admin-only)", () => {
    const r = validateProfileEdit(employee, { department: "Sales" } as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty("department");
  });

  it("bio is limited to 500 characters", () => {
    const r = validateProfileEdit(employee, { bio: "x".repeat(501) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty("bio");
  });

  it("self rating must be a whole number from 1 to 5", () => {
    const r = validateProfileEdit(employee, { skills: [{ subjectId: "s", selfRating: 0 }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty("skills");
  });

  it("language level must be basic, working, or fluent", () => {
    const r = validateProfileEdit(employee, { languages: [{ language: "Hindi", level: "NATIVE" as never }] });
    expect(r.ok).toBe(false);
  });

  it("an administrator may set employment fields", () => {
    const admin: SessionUser = { ...employee, id: "a1", role: "ADMIN" };
    expect(validateProfileEdit(admin, { department: "Sales", jobTitle: "Engineer" } as never)).toEqual({ ok: true });
  });
});

describe("initials for the avatar fallback", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsFor("Anil Bhat")).toBe("AB");
  });
  it("a single word gives its first two letters", () => {
    expect(initialsFor("Ravi")).toBe("RA");
  });
});

describe("language rows (review Critical 4)", () => {
  it("a language row with no language name is refused, not stored", () => {
    const r = validateProfileEdit(employee, { languages: [{ language: "", level: "WORKING" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty("languages");
  });

  it("the same language twice is refused", () => {
    const r = validateProfileEdit(employee, {
      languages: [{ language: "Hindi", level: "FLUENT" }, { language: "Hindi", level: "BASIC" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty("languages");
  });
});
