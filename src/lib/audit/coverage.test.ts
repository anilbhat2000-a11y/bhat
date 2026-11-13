import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { addQuestion } from "../assessments/admin";

const tag = `audit-cov-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
let subjectId: string;
let assessmentId: string;

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  assessmentId = (await prisma.assessment.create({ data: { subjectId, title: tag, cadence: "ONE_TIME", level: "BASIC", passMarkPercent: 70 } })).id;
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
  await prisma.question.deleteMany({ where: { assessmentId } });
  await prisma.assessment.deleteMany({ where: { id: assessmentId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

it("adding a question writes an audit row naming the question", async () => {
  await addQuestion(admin, assessmentId, { type: "SINGLE", text: "Audited question", options: "A|B", correct: "1", points: "1" });
  const rows = await prisma.auditEvent.findMany({ where: { actorId: admin.id, action: "question.add" } });
  expect(rows).toHaveLength(1);
  expect(rows[0].after).toMatchObject({ text: "Audited question" });
});
