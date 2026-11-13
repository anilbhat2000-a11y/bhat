import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import { myCertifications } from "./certifications";

const tag = `mycerts-${Date.now()}`;
let mine: string;
let theirs: string;
let subjectId: string;

beforeAll(async () => {
  const a = await prisma.user.create({ data: { name: "Mine", email: `${tag}-a@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  mine = a.id;
  const b = await prisma.user.create({ data: { name: "Theirs", email: `${tag}-b@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  theirs = b.id;
  const s = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } });
  subjectId = s.id;
  await prisma.certification.create({ data: { userId: mine, subjectId, level: "BASIC", issuedAt: new Date("2026-01-01T00:00:00Z"), expiresAt: new Date("2027-01-01T00:00:00Z"), verificationCode: `${tag}-1` } });
  await prisma.certification.create({ data: { userId: mine, subjectId, level: "ADVANCED", issuedAt: new Date("2025-01-01T00:00:00Z"), expiresAt: new Date("2026-01-01T00:00:00Z"), verificationCode: `${tag}-2` } });
  await prisma.certification.create({ data: { userId: theirs, subjectId, level: "ADVANCED", issuedAt: new Date("2026-01-01T00:00:00Z"), expiresAt: new Date("2027-01-01T00:00:00Z"), verificationCode: `${tag}-3` } });
});

afterAll(async () => {
  await prisma.certification.deleteMany({ where: { subjectId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("my certifications", () => {
  it("returns only the learner's own certifications, with an active flag", async () => {
    const rows = await myCertifications(mine, new Date("2026-06-01T00:00:00Z"));
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.level === "BASIC")?.active).toBe(true);
    expect(rows.find((r) => r.level === "ADVANCED")?.active).toBe(false);
  });
});
