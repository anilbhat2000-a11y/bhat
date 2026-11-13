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
    expect(await readSession(token, new Date(expiresAt.getTime() - 1))).not.toBeNull();
    expect(await readSession(token, new Date(expiresAt.getTime() + 1))).toBeNull();
  });

  it("returns null for a deactivated user even with a live session (Review Focus 2)", async () => {
    const { token } = await createSession(userId);
    await prisma.user.update({ where: { id: userId }, data: { active: false } });
    expect(await readSession(token)).toBeNull();
    await prisma.user.update({ where: { id: userId }, data: { active: true } });
  });
});
