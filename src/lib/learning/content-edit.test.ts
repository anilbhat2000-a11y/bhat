import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { addLesson, deleteLesson } from "./courses";
import { addQuestion, deleteQuestion, updateAssessmentSettings } from "../assessments/admin";

const tag = `edit-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
let courseId: string;
let subjectId: string;
let assessmentId: string;

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  courseId = (await prisma.course.create({ data: { subjectId, title: `${tag} c`, level: "BASIC", passMarkPercent: 70 } })).id;
  assessmentId = (await prisma.assessment.create({ data: { subjectId, title: `${tag} a`, cadence: "ONE_TIME", level: "BASIC", passMarkPercent: 70 } })).id;
});

afterAll(async () => {
  await prisma.assessment.deleteMany({ where: { subjectId } });
  await prisma.course.deleteMany({ where: { subjectId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

it("a lab without a checklist is refused, with the reason", async () => {
  const r = await addLesson(admin, courseId, { title: "Lab", type: "LAB", body: "Just text, no steps" });
  expect(r.ok).toBe(false);
});

it("an admin deletes a lesson", async () => {
  const r = await addLesson(admin, courseId, { title: "Gone", type: "TEXT", body: "x" });
  if (!r.ok || !r.id) throw new Error("setup");
  expect((await deleteLesson(admin, r.id)).ok).toBe(true);
  expect(await prisma.lesson.findUnique({ where: { id: r.id } })).toBeNull();
});

it("an admin deletes a wrong question, and changes the assessment's settings", async () => {
  const q = await addQuestion(admin, assessmentId, { type: "SINGLE", text: "Wrong", options: "A|B", correct: "1", points: "1" });
  if (!q.ok || !q.id) throw new Error("setup");
  expect((await deleteQuestion(admin, q.id)).ok).toBe(true);
  expect(await prisma.question.findUnique({ where: { id: q.id } })).toBeNull();
  expect((await updateAssessmentSettings(admin, assessmentId, { passMarkPercent: 80, showAnswersAfterSubmit: false, maxAttemptsPerPeriod: 2, timeLimitMinutes: null, questionsPerAttempt: null })).ok).toBe(true);
  const a = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  expect(a?.passMarkPercent).toBe(80);
  expect(a?.maxAttemptsPerPeriod).toBe(2);
});
