import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { startAttempt, submitAttempt, attemptForUser } from "./take";

const tag = `results-${Date.now()}`;
let learner: SessionUser;
let subjectId: string;
const made: string[] = [];

async function setup(showAnswers: boolean) {
  const a = await prisma.assessment.create({
    data: { subjectId, title: `${tag} ${showAnswers}`, cadence: "MONTHLY", level: "BASIC", passMarkPercent: 50, published: true, showAnswersAfterSubmit: showAnswers },
  });
  made.push(a.id);
  const q = await prisma.question.create({
    data: { assessmentId: a.id, position: 1, type: "SINGLE", text: "Q", options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }], correctOptionIds: ["o2"], points: 1 },
  });
  const p = await prisma.assessmentPeriod.create({
    data: { assessmentId: a.id, userId: learner.id, periodKey: `2026-${showAnswers ? "10" : "09"}`, opensAt: new Date("2026-09-01Z"), dueAt: new Date("2026-12-31Z") },
  });
  const started = await startAttempt(learner, p.id);
  await submitAttempt(learner, started.attemptId, { [q.id]: ["o1"] });
  return started.attemptId;
}

beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: "L", email: `${tag}@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  learner = { id: u.id, role: "EMPLOYEE", active: true, name: "L", email: u.email, department: null };
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
});

afterAll(async () => {
  await prisma.assessmentAttempt.deleteMany({ where: { userId: learner.id } });
  await prisma.assessmentPeriod.deleteMany({ where: { userId: learner.id } });
  await prisma.question.deleteMany({ where: { assessmentId: { in: made } } });
  await prisma.assessment.deleteMany({ where: { id: { in: made } } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("results after submit (spec 5: show answers when enabled)", () => {
  it("shows the correct options after a submit when the admin enabled it", async () => {
    const attemptId = await setup(true);
    const view = await attemptForUser(learner, attemptId);
    expect(view?.status).toBe("SUBMITTED");
    expect(Object.values(view?.correctOptionIds ?? {})[0]).toEqual(["o2"]);
  });

  it("hides the correct options when the admin did not enable it", async () => {
    const attemptId = await setup(false);
    const view = await attemptForUser(learner, attemptId);
    expect(view?.correctOptionIds).toBeUndefined();
  });
});
