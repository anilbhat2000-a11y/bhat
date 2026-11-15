import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { addAssessmentTargets, removeAssessmentTarget } from "./admin";
import { openPeriodsFor } from "./open-periods";

const tag = `asg-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
let assessmentId: string;
let u1: string, u2: string;

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
  u1 = (await prisma.user.create({ data: { name: "U1", email: `${tag}-1@example.test`, passwordHash: "x", role: "EMPLOYEE", department: `${tag} D` } })).id;
  u2 = (await prisma.user.create({ data: { name: "U2", email: `${tag}-2@example.test`, passwordHash: "x", role: "EMPLOYEE" } })).id;
  const subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "TECHNICAL" } })).id;
  assessmentId = (await prisma.assessment.create({ data: { subjectId, title: `${tag} a`, cadence: "ONE_TIME", level: "BASIC", passMarkPercent: 70, published: true } })).id;
});
afterAll(async () => {
  await prisma.assessment.deleteMany({ where: { title: { startsWith: tag } } });
  await prisma.subject.deleteMany({ where: { slug: tag } });
  await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.$disconnect();
});

it("adds employees and departments without replacing earlier assignments, and removes one", async () => {
  expect(await addAssessmentTargets(admin, assessmentId, [])).toMatchObject({ ok: false });
  expect(await addAssessmentTargets(admin, assessmentId, [{ targetType: "USER", targetValue: u2 }])).toEqual({ ok: true, added: 1 });
  expect(await addAssessmentTargets(admin, assessmentId, [{ targetType: "DEPARTMENT", targetValue: `${tag} D` }, { targetType: "USER", targetValue: u2 }])).toEqual({ ok: true, added: 1 });
  expect(await addAssessmentTargets(admin, assessmentId, [{ targetType: "USER", targetValue: u2 }])).toEqual({ ok: true, added: 0 });
  expect(await addAssessmentTargets(admin, assessmentId, [{ targetType: "USER", targetValue: "no-such-user" }])).toMatchObject({ ok: false });
  const rows = await prisma.assessmentAssignment.findMany({ where: { assessmentId } });
  expect(rows.map((r) => r.targetType).sort()).toEqual(["DEPARTMENT", "USER"]);
  await openPeriodsFor(assessmentId);
  expect((await prisma.assessmentPeriod.findMany({ where: { assessmentId } })).map((p) => p.userId).sort()).toEqual([u1, u2].sort());

  // Removing the person drops their unstarted period; the department stays.
  const person = rows.find((r) => r.targetType === "USER")!;
  expect(await removeAssessmentTarget(admin, person.id)).toMatchObject({ ok: true });
  expect((await prisma.assessmentAssignment.findMany({ where: { assessmentId } })).map((r) => r.targetType)).toEqual(["DEPARTMENT"]);
  expect((await prisma.assessmentPeriod.findMany({ where: { assessmentId } })).map((p) => p.userId)).toEqual([u1]);
});
