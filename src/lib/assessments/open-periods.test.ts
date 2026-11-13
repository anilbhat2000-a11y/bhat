import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import { openPeriodsFor } from "./open-periods";

const tag = `open-periods-${Date.now()}`;
let subjectId: string;
let userId: string;
let otherUserId: string;
let assessmentId: string;

beforeAll(async () => {
  const s = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } });
  subjectId = s.id;
  const u = await prisma.user.create({ data: { name: "U", email: `${tag}-u@example.test`, passwordHash: "x", role: "EMPLOYEE", department: "Ops" } });
  userId = u.id;
  const o = await prisma.user.create({ data: { name: "O", email: `${tag}-o@example.test`, passwordHash: "x", role: "EMPLOYEE", department: "Other" } });
  otherUserId = o.id;
  const a = await prisma.assessment.create({
    data: { subjectId, title: `${tag} weekly`, cadence: "WEEKLY", level: "BASIC", passMarkPercent: 70, published: true },
  });
  assessmentId = a.id;
  await prisma.assessmentAssignment.create({ data: { assessmentId, targetType: "DEPARTMENT", targetValue: "Ops" } });
});

afterAll(async () => {
  await prisma.assessmentPeriod.deleteMany({ where: { assessmentId } });
  await prisma.assessmentAssignment.deleteMany({ where: { assessmentId } });
  await prisma.assessment.deleteMany({ where: { id: assessmentId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.$disconnect();
});

describe("openPeriodsFor", () => {
  it("opens the current period once; a second call creates nothing (idempotent)", async () => {
    const now = new Date("2026-11-20T10:00:00Z");
    expect((await openPeriodsFor(assessmentId, now)).created).toBe(1);
    expect((await openPeriodsFor(assessmentId, now)).created).toBe(0);
  });

  it("opens only the current period for a user assigned mid-period, never back-filling (spec 5)", async () => {
    const keys = (await prisma.assessmentPeriod.findMany({ where: { assessmentId, userId }, select: { periodKey: true } }))
      .map((p) => p.periodKey);
    expect(keys).toEqual(["2026-W47"]);
  });

  it("assigns only the targeted department", async () => {
    expect(await prisma.assessmentPeriod.count({ where: { assessmentId, userId: otherUserId } })).toBe(0);
  });

  it("marks an open period past its due time as OVERDUE", async () => {
    await openPeriodsFor(assessmentId, new Date("2026-11-23T10:00:00Z"));
    const p = await prisma.assessmentPeriod.findFirst({ where: { assessmentId, userId, periodKey: "2026-W47" } });
    expect(p?.status).toBe("OVERDUE");
  });

  it("never changes a PASSED period, even when it is past due (Review Focus: passed stays passed)", async () => {
    const passedUser = await prisma.user.create({ data: { name: "P", email: `${tag}-p@example.test`, passwordHash: "x", role: "EMPLOYEE", department: "Ops" } });
    await prisma.assessmentPeriod.create({
      data: {
        assessmentId, userId: passedUser.id, periodKey: "2026-W47",
        opensAt: new Date("2026-11-16T00:00:00Z"), dueAt: new Date("2026-11-22T23:59:59.999Z"), status: "PASSED",
      },
    });
    await openPeriodsFor(assessmentId, new Date("2026-11-23T10:00:00Z"));
    const p = await prisma.assessmentPeriod.findFirst({ where: { assessmentId, userId: passedUser.id } });
    expect(p?.status).toBe("PASSED");
  });
});
