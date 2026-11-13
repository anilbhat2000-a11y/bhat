import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../db/client";
import { createLocalStorage } from "../storage/local";
import { AuthError } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { saveProfile, setUserPhoto } from "./service";

const tag = `profile-${Date.now()}`;
let root: string;
let employee: SessionUser;
let manager: SessionUser;
let subjectId: string;

const PNG = Buffer.from("89504e470d0a1a0a", "hex");

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "lms-profile-"));
  const e = await prisma.user.create({ data: { name: "Emp", email: `${tag}-e@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  employee = { id: e.id, role: "EMPLOYEE", active: true, name: "Emp", email: e.email, department: null };
  const m = await prisma.user.create({ data: { name: "Mgr", email: `${tag}-m@example.test`, passwordHash: "x", role: "MANAGER" } });
  manager = { id: m.id, role: "MANAGER", active: true, name: "Mgr", email: m.email, department: null };
  const s = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } });
  subjectId = s.id;
});

afterAll(async () => {
  await prisma.profileSkill.deleteMany({ where: { subjectId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
  rmSync(root, { recursive: true, force: true });
});

describe("saving a profile", () => {
  it("an employee saves their own bio and self-rated skill", async () => {
    const r = await saveProfile(employee, employee.id, { bio: "Sales engineer", skills: [{ subjectId, selfRating: 4 }] });
    expect(r.ok).toBe(true);
    expect((await prisma.user.findUnique({ where: { id: employee.id } }))?.bio).toBe("Sales engineer");
    expect(await prisma.profileSkill.count({ where: { userId: employee.id, subjectId, selfRating: 4 } })).toBe(1);
  });

  it("a manager cannot edit a team member's profile (403)", async () => {
    await expect(saveProfile(manager, employee.id, { bio: "x" })).rejects.toBeInstanceOf(AuthError);
  });

  it("an employee cannot change their own department", async () => {
    const r = await saveProfile(employee, employee.id, { department: "Sales" } as never);
    expect(r.ok).toBe(false);
  });

  it("an administrator can set the department", async () => {
    const admin: SessionUser = { ...employee, id: (await prisma.user.create({ data: { name: "Adm", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id, role: "ADMIN" };
    const r = await saveProfile(admin, employee.id, { department: "Sales" } as never);
    expect(r.ok).toBe(true);
    expect((await prisma.user.findUnique({ where: { id: employee.id } }))?.department).toBe("Sales");
  });
});

describe("profile photos", () => {
  it("refuses a photo over the 5 MB limit and stores nothing", async () => {
    const storage = createLocalStorage(root);
    const before = (await prisma.user.findUnique({ where: { id: employee.id } }))?.photoFileKey;
    const r = await setUserPhoto(employee, employee.id, { filename: "big.png", mime: "image/png", sizeBytes: 6 * 1024 * 1024, bytes: PNG }, storage);
    expect(r.ok).toBe(false);
    expect((await prisma.user.findUnique({ where: { id: employee.id } }))?.photoFileKey).toBe(before ?? null);
  });

  it("stores an accepted photo and records its key on the user", async () => {
    const storage = createLocalStorage(root);
    const r = await setUserPhoto(employee, employee.id, { filename: "me.png", mime: "image/png", sizeBytes: PNG.length, bytes: PNG }, storage);
    expect(r.ok).toBe(true);
    expect((await prisma.user.findUnique({ where: { id: employee.id } }))?.photoFileKey).toMatch(/\.png$/);
  });
});
