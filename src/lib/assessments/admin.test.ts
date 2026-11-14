import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import {
  createAssessment, addQuestion, importQuestions, setAssessmentPublished, setAssignments,
} from "./admin";

const tag = `assess-admin-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
let subjectId: string;
let assessmentId: string;

beforeAll(async () => {
  const a = await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } });
  admin.id = a.id;
  const s = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } });
  subjectId = s.id;
  const r = await createAssessment(admin, { subjectId, title: `${tag} a`, cadence: "MONTHLY", level: "INTERMEDIATE", passMarkPercent: 70 });
  if (!r.ok || !r.id) throw new Error("setup");
  assessmentId = r.id;
});

afterAll(async () => {
  await prisma.assessment.deleteMany({ where: { subjectId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("admin assessment authoring", () => {
  it("refuses to publish with no questions", async () => {
    expect(await setAssessmentPublished(admin, assessmentId, true)).toEqual({ ok: false, error: "Add at least one question before publishing" });
  });

  it("adds a valid question", async () => {
    const r = await addQuestion(admin, assessmentId, { type: "SINGLE", text: "Pick B", options: "A|B|C", correct: "2", points: "1" });
    expect(r.ok).toBe(true);
  });

  it("refuses an invalid question with the reason", async () => {
    const r = await addQuestion(admin, assessmentId, { type: "SINGLE", text: "Bad", options: "A|B", correct: "9", points: "1" });
    expect(r.ok).toBe(false);
  });

  it("import is all-or-nothing: one bad row adds nothing (spec 6)", async () => {
    const before = await prisma.question.count({ where: { assessmentId } });
    const r = await importQuestions(admin, assessmentId, [
      { type: "SINGLE", text: "Good", options: "A|B", correct: "1", points: "1" },
      { type: "SINGLE", text: "Bad", options: "A|B", correct: "7", points: "1" },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].row).toBe(2);
    expect(await prisma.question.count({ where: { assessmentId } })).toBe(before);
  });

  it("refuses a questions-per-attempt value larger than the question bank when publishing", async () => {
    await prisma.assessment.update({ where: { id: assessmentId }, data: { questionsPerAttempt: 50 } });
    expect((await setAssessmentPublished(admin, assessmentId, true)).ok).toBe(false);
    await prisma.assessment.update({ where: { id: assessmentId }, data: { questionsPerAttempt: null } });
  });

  it("publishes once there are enough questions", async () => {
    expect((await setAssessmentPublished(admin, assessmentId, true)).ok).toBe(true);
  });

  it("replaces assignments as a set", async () => {
    await setAssignments(admin, assessmentId, [{ targetType: "DEPARTMENT", targetValue: "Sales" }, { targetType: "DEPARTMENT", targetValue: "Ops" }]);
    await setAssignments(admin, assessmentId, [{ targetType: "ALL", targetValue: null }]);
    const rows = await prisma.assessmentAssignment.findMany({ where: { assessmentId } });
    expect(rows.map((r) => r.targetType)).toEqual(["ALL"]);
    // Remove it at once: a published assessment assigned to everyone would reach the users
    // of other test files running in parallel.
    await prisma.assessmentAssignment.deleteMany({ where: { assessmentId } });
  });
});

describe("annual exams", () => {
  it("are created in proctored mode with 5 allowed violations; others are not proctored", async () => {
    const tag = `annual-${Date.now()}`;
    const a = await prisma.user.create({ data: { name: "A", email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN" } });
    const actor = { id: a.id, role: "ADMIN" as const, active: true, name: "A", email: a.email, department: null };
    const subject = await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "TECHNICAL" } });
    const annual = await createAssessment(actor, { subjectId: subject.id, title: "Annual", cadence: "ANNUAL", level: "ADVANCED", passMarkPercent: 70 });
    const weekly = await createAssessment(actor, { subjectId: subject.id, title: "Weekly", cadence: "WEEKLY", level: "BASIC", passMarkPercent: 70 });
    const rows = await prisma.assessment.findMany({ where: { subjectId: subject.id }, orderBy: { title: "asc" } });
    expect(annual.ok && weekly.ok).toBe(true);
    expect(rows.map((r) => [r.title, r.proctored, r.proctorMaxViolations])).toEqual([["Annual", true, 5], ["Weekly", false, 5]]);
    await prisma.auditEvent.deleteMany({ where: { actorId: a.id } });
    await prisma.assessment.deleteMany({ where: { subjectId: subject.id } });
    await prisma.subject.delete({ where: { id: subject.id } });
    await prisma.user.delete({ where: { id: a.id } });
  });
});
