import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { prisma } from "../db/client";
import { createSession, readSession } from "./session";

describe("sessions", () => {
  const tag = `session-test-${Date.now()}`;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: "Session Test", email: `${tag}@example.test`, passwordHash: "x", role: "EMPLOYEE", department: "Sales" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("returns the user for a fresh token", async () => {
    const { token } = await createSession(userId);
    const user = await readSession(token);
    expect(user).toMatchObject({ id: userId, role: "EMPLOYEE", active: true, department: "Sales" });
  });

  it("stores only the sha256 of the token, never the token", async () => {
    const { token } = await createSession(userId);
    const hashed = createHash("sha256").update(token).digest("hex");
    expect(await prisma.session.findUnique({ where: { id: hashed } })).not.toBeNull();
    expect(await prisma.session.findUnique({ where: { id: token } })).toBeNull();
  });

  it("returns null once the session has expired", async () => {
    const now = new Date("2026-11-13T00:00:00Z");
    const { token, expiresAt } = await createSession(userId, now);
    const noIdle = Number.POSITIVE_INFINITY;
    expect(await readSession(token, new Date(expiresAt.getTime() - 1), noIdle)).not.toBeNull();
    expect(await readSession(token, new Date(expiresAt.getTime() + 1), noIdle)).toBeNull();
  });

  it("ends a session left idle longer than the idle timeout, and keeps an active one", async () => {
    const start = new Date("2026-11-13T00:00:00Z");
    const idle = 30 * 60 * 1000;
    const { token } = await createSession(userId, start);
    const at20 = new Date(start.getTime() + 20 * 60 * 1000);
    expect(await readSession(token, at20, idle)).not.toBeNull(); // also marks it as seen
    const at45 = new Date(start.getTime() + 45 * 60 * 1000);
    expect(await readSession(token, at45, idle)).not.toBeNull(); // 25 minutes after last use
    const at80 = new Date(start.getTime() + 80 * 60 * 1000);
    expect(await readSession(token, at80, idle)).toBeNull(); // 35 minutes idle
  });

  it("returns null for a deactivated user even with a live session (Review Focus 2)", async () => {
    const { token } = await createSession(userId);
    await prisma.user.update({ where: { id: userId }, data: { active: false } });
    expect(await readSession(token)).toBeNull();
    await prisma.user.update({ where: { id: userId }, data: { active: true } });
  });
});
