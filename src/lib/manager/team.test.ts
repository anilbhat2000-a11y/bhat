import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { teamMembers, memberDetail } from "./team";

const tag = `team-${Date.now()}`;
let manager: SessionUser;
let direct: string;
let indirect: string;
let peerManager: SessionUser;
let outsider: string;

const asUser = (id: string, role: SessionUser["role"]): SessionUser => ({ id, role, active: true, name: id, email: "", department: null });

beforeAll(async () => {
  const m = await prisma.user.create({ data: { name: "Mgr", email: `${tag}-m@example.test`, passwordHash: "x", role: "MANAGER" } });
  manager = asUser(m.id, "MANAGER");
  const d = await prisma.user.create({ data: { name: "Direct", email: `${tag}-d@example.test`, passwordHash: "x", role: "EMPLOYEE", managerId: m.id } });
  direct = d.id;
  const i = await prisma.user.create({ data: { name: "Indirect", email: `${tag}-i@example.test`, passwordHash: "x", role: "EMPLOYEE", managerId: d.id } });
  indirect = i.id;
  const p = await prisma.user.create({ data: { name: "Peer", email: `${tag}-p@example.test`, passwordHash: "x", role: "MANAGER" } });
  peerManager = asUser(p.id, "MANAGER");
  const o = await prisma.user.create({ data: { name: "Outsider", email: `${tag}-o@example.test`, passwordHash: "x", role: "EMPLOYEE", managerId: p.id } });
  outsider = o.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("manager team views", () => {
  it("lists the whole reporting line, direct and indirect, and nobody outside it", async () => {
    const ids = (await teamMembers(manager)).map((r) => r.id);
    expect(ids).toContain(direct);
    expect(ids).toContain(indirect);
    expect(ids).not.toContain(outsider);
  });

  it("opens an indirect report's detail", async () => {
    const detail = await memberDetail(manager, indirect);
    expect(detail.name).toBe("Indirect");
  });

  it("refuses a user outside the reporting line with 403 (spec: managers see only their line)", async () => {
    await expect(memberDetail(manager, outsider)).rejects.toMatchObject({ status: 403 });
  });

  it("a manager cannot open another manager's team member either", async () => {
    await expect(memberDetail(peerManager, direct)).rejects.toMatchObject({ status: 403 });
  });

  it("an employee cannot open anyone else's detail, not even a colleague's", async () => {
    await expect(memberDetail(asUser(direct, "EMPLOYEE"), indirect)).rejects.toMatchObject({ status: 403 });
  });
});
