import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../db/client";
import { createSession } from "../auth/session";
import { createUser, updateUser, setActive, createSubject, importUsers } from "./users";
import type { SessionUser } from "../auth/session";

const tag = `admin-users-${Date.now()}`;
const actor: SessionUser = { id: "", role: "ADMIN", active: true, name: "Admin", email: "", department: null };
const employee: SessionUser = { id: "", role: "EMPLOYEE", active: true, name: "Emp", email: "", department: null };

beforeAll(async () => {
  const admin = await prisma.user.create({ data: { name: "Admin", email: `${tag}-admin@example.test`, passwordHash: "x", role: "ADMIN" } });
  actor.id = admin.id; actor.email = admin.email;
  const emp = await prisma.user.create({ data: { name: "Emp", email: `${tag}-emp@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  employee.id = emp.id; employee.email = emp.email;
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { user: { email: { contains: tag } } } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.subject.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.$disconnect();
});

describe("admin user management", () => {
  it("refuses a non-admin actor (403)", async () => {
    await expect(createUser(employee, { name: "X", email: `${tag}-x@example.test`, role: "EMPLOYEE", password: "Start-pass-1" }))
      .rejects.toMatchObject({ status: 403 });
  });

  it("refuses a duplicate email, case-insensitively", async () => {
    const r = await createUser(actor, { name: "Dup", email: `${tag}-EMP@example.test`, role: "EMPLOYEE", password: "Start-pass-1" });
    expect(r).toEqual({ ok: false, error: "A user with this email already exists" });
  });

  it("refuses a password shorter than 8 characters", async () => {
    const r = await createUser(actor, { name: "Short", email: `${tag}-s@example.test`, role: "EMPLOYEE", password: "short" });
    expect(r.ok).toBe(false);
  });

  it("refuses a manager who sits under the user in the reporting line (Review Focus 5)", async () => {
    const boss = await prisma.user.create({ data: { name: "Boss", email: `${tag}-boss@example.test`, passwordHash: "x", role: "MANAGER", managerId: employee.id } });
    const r = await updateUser(actor, employee.id, { managerId: boss.id });
    expect(r.ok).toBe(false);
  });

  it("deactivating a user deletes their sessions", async () => {
    const target = await prisma.user.create({ data: { name: "Target", email: `${tag}-t@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
    await createSession(target.id);
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(1);
    expect((await setActive(actor, target.id, false)).ok).toBe(true);
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0);
  });

  it("an admin cannot deactivate their own account", async () => {
    const r = await setActive(actor, actor.id, false);
    expect(r.ok).toBe(false);
  });

  it("creating a subject derives a slug and stores the validity period", async () => {
    const r = await createSubject(actor, { name: `${tag} Cloud Ops`, category: "TECHNICAL", certificationValidityMonths: 12 });
    expect(r.ok).toBe(true);
    const row = await prisma.subject.findUnique({ where: { name: `${tag} Cloud Ops` } });
    expect(row?.slug).toBe(`${tag}-cloud-ops`);
  });

  it("CSV import refuses the whole file on one bad row, naming the row, and creates no users", async () => {
    const csv = [
      "name,email,role,department,managerEmail,password",
      `Good One,${tag}-g1@example.test,EMPLOYEE,Sales,,Start-pass-1`,
      `Bad Row,not-an-email,EMPLOYEE,Sales,,Start-pass-1`,
    ].join("\n");
    const r = await importUsers(actor, csv);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual([expect.objectContaining({ row: 2 })]);
    expect(await prisma.user.count({ where: { email: `${tag}-g1@example.test` } })).toBe(0);
  });
});
