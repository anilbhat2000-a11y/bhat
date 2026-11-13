import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import * as auditModule from "./record";
import { changedFields, recordAudit, listAudit } from "./record";
import { setActive } from "../admin/users";
import type { SessionUser } from "../auth/session";

describe("changedFields", () => {
  it("lists only keys whose values differ, sorted", () => {
    expect(changedFields({ name: "A", role: "EMPLOYEE", x: 1 }, { name: "B", role: "EMPLOYEE", x: 1 })).toEqual(["name"]);
    expect(changedFields({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 })).toEqual(["b", "c"]);
  });
});

describe("the audit log is append-only", () => {
  it("exposes no update or delete for audit events", () => {
    const names = Object.keys(auditModule);
    expect(names.some((n) => /update|delete|remove|edit/i.test(n))).toBe(false);
  });
});

describe("audit events are written by admin actions", () => {
  const tag = `audit-${Date.now()}`;
  const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
  let target: string;

  beforeAll(async () => {
    const a = await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } });
    admin.id = a.id;
    const t = await prisma.user.create({ data: { name: "T", email: `${tag}-t@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
    target = t.id;
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("deactivating a user writes one audit row with the actor, action, and state change", async () => {
    await setActive(admin, target, false);
    const rows = await prisma.auditEvent.findMany({ where: { actorId: admin.id, entityId: target } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "user.deactivate", entityType: "User" });
    expect(rows[0].before).toEqual({ active: true });
    expect(rows[0].after).toEqual({ active: false });
  });

  it("recordAudit stores an event and listAudit returns it, newest first", async () => {
    await recordAudit(prisma, { actorId: admin.id, action: "test.one", entityType: "Test", entityId: "x1", before: null, after: { a: 1 } });
    await recordAudit(prisma, { actorId: admin.id, action: "test.two", entityType: "Test", entityId: "x1", before: null, after: { a: 2 } });
    const rows = await listAudit({ entityType: "Test" });
    expect(rows[0].action).toBe("test.two");
  });
});
