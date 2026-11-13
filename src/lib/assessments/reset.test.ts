import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { startAttempt, submitAttempt } from "./take";
import { resetAttempts } from "./admin";

const tag = `reset-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
let learner: SessionUser;
let assessmentId: string;
let subjectId: string;
let periodId: string;

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
  const u = await prisma.user.create({ data: { name: "L", email: `${tag}-l@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  learner = { id: u.id, role: "EMPLOYEE", active: true, name: "L", email: u.email, department: null };
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  assessmentId = (await prisma.assessment.create({
    data: { subjectId, title: tag, cadence: "ONE_TIME", level: "BASIC", passMarkPercent: 70, published: true, maxAttemptsPerPeriod: 3 },
  })).id;
  await prisma.question.create({ data: { assessmentId, position: 1, type: "SINGLE", text: "Q", options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }], correctOptionIds: ["o2"], points: 1 } });
  periodId = (await prisma.assessmentPeriod.create({
    data: { assessmentId, userId: learner.id, periodKey: "ONCE", opensAt: new Date(0), dueAt: new Date("9999-12-31T23:59:59.999Z") },
  })).id;
});

afterAll(async () => {
  await prisma.assessmentAttempt.deleteMany({ where: { userId: learner.id } });
  await prisma.assessmentPeriod.deleteMany({ where: { assessmentId } });
  await prisma.question.deleteMany({ where: { assessmentId } });
  await prisma.assessment.deleteMany({ where: { id: assessmentId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

it("after three failed attempts, an admin reset lets the learner try again", async () => {
  for (let i = 0; i < 3; i++) {
    const a = await startAttempt(learner, periodId);
    await submitAttempt(learner, a.attemptId, {});
  }
  await expect(startAttempt(learner, periodId)).rejects.toThrow(/attempt limit/i);
  expect((await resetAttempts(admin, periodId)).ok).toBe(true);
  const retry = await startAttempt(learner, periodId);
  expect(retry.questions).toHaveLength(1);
  // The voided attempts stay on record, not deleted.
  expect(await prisma.assessmentAttempt.count({ where: { userId: learner.id, status: "VOIDED" } })).toBe(3);
});
