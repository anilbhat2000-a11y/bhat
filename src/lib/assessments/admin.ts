import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { parseQuestionRows, type QuestionRow } from "../import/questions";
import type { Cadence, Level } from "../../generated/prisma/client";
import { recordAudit, writeWithAudit } from "../audit/record";

export type Result = { ok: true; id?: string } | { ok: false; error: string };
const asAdmin = (actor: SessionUser) => requireRole(actor, ["ADMIN"]);

export async function createAssessment(
  actor: SessionUser,
  input: {
    subjectId: string;
    title: string;
    cadence: Cadence;
    level: Level;
    passMarkPercent: number;
    timeLimitMinutes?: number | null;
    maxAttemptsPerPeriod?: number;
    questionsPerAttempt?: number | null;
    showAnswersAfterSubmit?: boolean;
  },
): Promise<Result> {
  asAdmin(actor);
  if (!input.title.trim()) return { ok: false, error: "Title is required" };
  if (!Number.isInteger(input.passMarkPercent) || input.passMarkPercent < 1 || input.passMarkPercent > 100) {
    return { ok: false, error: "Pass mark must be between 1 and 100" };
  }
  const attempts = input.maxAttemptsPerPeriod ?? 3;
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10) return { ok: false, error: "Attempts per period must be 1 to 10" };
  const assessment = await writeWithAudit(
    (tx) =>
      tx.assessment.create({
        data: {
          subjectId: input.subjectId,
          title: input.title.trim(),
          cadence: input.cadence,
          level: input.level,
          passMarkPercent: input.passMarkPercent,
          timeLimitMinutes: input.timeLimitMinutes ?? null,
          maxAttemptsPerPeriod: attempts,
          questionsPerAttempt: input.questionsPerAttempt ?? null,
          showAnswersAfterSubmit: input.showAnswersAfterSubmit ?? false,
        },
      }),
    (a) => ({ actorId: actor.id, action: "assessment.create", entityType: "Assessment", entityId: a.id, after: { title: a.title, cadence: a.cadence } }),
  );
  return { ok: true, id: assessment.id };
}

async function nextPosition(assessmentId: string): Promise<number> {
  const last = await prisma.question.findFirst({ where: { assessmentId }, orderBy: { position: "desc" } });
  return (last?.position ?? 0) + 1;
}

export async function addQuestion(actor: SessionUser, assessmentId: string, row: QuestionRow): Promise<Result> {
  asAdmin(actor);
  const parsed = parseQuestionRows([row]);
  if (!parsed.ok) return { ok: false, error: parsed.errors[0].reason };
  const [q] = parsed.questions;
  const position = await nextPosition(assessmentId);
  const created = await writeWithAudit(
    (tx) =>
      tx.question.create({
        data: {
          assessmentId,
          position,
          type: q.type,
          text: q.text,
          options: q.options,
          correctOptionIds: q.correctOptionIds,
          points: q.points,
        },
      }),
    (c) => ({ actorId: actor.id, action: "question.add", entityType: "Question", entityId: c.id, after: { assessmentId, text: q.text } }),
  );
  return { ok: true, id: created.id };
}

// All-or-nothing: a single bad row saves nothing, and the errors name the row.
export async function importQuestions(
  actor: SessionUser,
  assessmentId: string,
  rows: QuestionRow[],
): Promise<{ ok: true; created: number } | { ok: false; errors: { row: number; reason: string }[] }> {
  asAdmin(actor);
  const parsed = parseQuestionRows(rows);
  if (!parsed.ok) return parsed;
  const start = await nextPosition(assessmentId);
  await prisma.$transaction(async (tx) => {
    for (const [i, q] of parsed.questions.entries()) {
      await tx.question.create({
        data: {
          assessmentId,
          position: start + i,
          type: q.type,
          text: q.text,
          options: q.options,
          correctOptionIds: q.correctOptionIds,
          points: q.points,
        },
      });
    }
    await recordAudit(tx, { actorId: actor.id, action: "question.import", entityType: "Assessment", entityId: assessmentId, after: { count: parsed.questions.length } });
  });
  return { ok: true, created: parsed.questions.length };
}

// Publishing needs at least one question, and a per-attempt draw can not exceed the bank.
export async function setAssessmentPublished(actor: SessionUser, id: string, published: boolean): Promise<Result> {
  asAdmin(actor);
  if (published) {
    const assessment = await prisma.assessment.findUnique({ where: { id } });
    if (!assessment) return { ok: false, error: "Assessment not found" };
    const count = await prisma.question.count({ where: { assessmentId: id } });
    if (count === 0) return { ok: false, error: "Add at least one question before publishing" };
    if (assessment.questionsPerAttempt !== null && assessment.questionsPerAttempt > count) {
      return { ok: false, error: `Questions per attempt (${assessment.questionsPerAttempt}) is more than the ${count} questions in the bank` };
    }
  }
  await writeWithAudit(
    (tx) => tx.assessment.update({ where: { id }, data: { published } }),
    () => ({ actorId: actor.id, action: published ? "assessment.publish" : "assessment.unpublish", entityType: "Assessment", entityId: id, after: { published } }),
  );
  return { ok: true, id };
}

// Replaces the whole assignment set in one transaction.
export async function setAssignments(
  actor: SessionUser,
  assessmentId: string,
  targets: { targetType: "ALL" | "DEPARTMENT" | "USER"; targetValue: string | null }[],
): Promise<Result> {
  asAdmin(actor);
  // Each target must match someone, so a typo cannot silently assign nobody.
  for (const t of targets) {
    if (t.targetType === "ALL") continue;
    if (t.targetType === "USER") {
      if (!t.targetValue || !(await prisma.user.findUnique({ where: { id: t.targetValue } }))) {
        return { ok: false, error: "No user matches that id" };
      }
    } else {
      const match = await prisma.user.findFirst({ where: { department: t.targetValue ?? "" } });
      if (!match) return { ok: false, error: `No one is in the department "${t.targetValue ?? ""}"` };
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.assessmentAssignment.deleteMany({ where: { assessmentId } });
    for (const t of targets) await tx.assessmentAssignment.create({ data: { assessmentId, ...t } });
    // Learners no longer assigned lose their open periods, if they have not started them.
    const stillAssigned = new Set(
      (await tx.user.findMany({ where: { active: true }, select: { id: true, department: true } })).filter((u) =>
        targets.some((t) => t.targetType === "ALL" || (t.targetType === "USER" && t.targetValue === u.id) ||
          (t.targetType === "DEPARTMENT" && t.targetValue === u.department)),
      ).map((u) => u.id),
    );
    const open = await tx.assessmentPeriod.findMany({ where: { assessmentId, status: "OPEN" }, select: { id: true, userId: true } });
    for (const p of open) {
      if (stillAssigned.has(p.userId)) continue;
      const attempts = await tx.assessmentAttempt.count({ where: { periodId: p.id } });
      if (attempts === 0) await tx.assessmentPeriod.delete({ where: { id: p.id } });
    }
    await recordAudit(tx, { actorId: actor.id, action: "assessment.assign", entityType: "Assessment", entityId: assessmentId, after: { targets } });
  });
  return { ok: true, id: assessmentId };
}

// An admin reopens a period: failed, expired and unfinished attempts are voided (kept on
// record, not counted), and an open period can be attempted again. A passed period stays passed.
export async function resetAttempts(actor: SessionUser, periodId: string): Promise<Result> {
  asAdmin(actor);
  const period = await prisma.assessmentPeriod.findUnique({ where: { id: periodId } });
  if (!period) return { ok: false, error: "Period not found" };
  if (period.status === "PASSED") return { ok: false, error: "This period is already passed" };
  await prisma.$transaction(async (tx) => {
    await tx.assessmentAttempt.updateMany({
      where: { periodId, status: { in: ["SUBMITTED", "EXPIRED", "IN_PROGRESS"] } },
      data: { status: "VOIDED" },
    });
    await tx.assessmentPeriod.update({ where: { id: periodId }, data: { status: "OPEN" } });
    await recordAudit(tx, { actorId: actor.id, action: "period.reset", entityType: "AssessmentPeriod", entityId: periodId, before: { status: period.status } });
  });
  return { ok: true, id: periodId };
}

// Deleting a question. Answers already given keep their stored question snapshot, so past
// attempts are unaffected.
export async function deleteQuestion(actor: SessionUser, questionId: string): Promise<Result> {
  asAdmin(actor);
  const q = await prisma.question.findUnique({ where: { id: questionId }, select: { assessmentId: true, text: true } });
  if (!q) return { ok: false, error: "Question not found" };
  await prisma.$transaction(async (tx) => {
    await tx.question.delete({ where: { id: questionId } });
    await recordAudit(tx, { actorId: actor.id, action: "question.delete", entityType: "Question", entityId: questionId, before: { text: q.text, assessmentId: q.assessmentId } });
  });
  return { ok: true, id: questionId };
}

// Changes an assessment's settings. Attempts already made are unchanged.
export async function updateAssessmentSettings(
  actor: SessionUser,
  id: string,
  input: {
    passMarkPercent: number;
    showAnswersAfterSubmit: boolean;
    maxAttemptsPerPeriod: number;
    timeLimitMinutes: number | null;
    questionsPerAttempt: number | null;
  },
): Promise<Result> {
  asAdmin(actor);
  if (!Number.isInteger(input.passMarkPercent) || input.passMarkPercent < 1 || input.passMarkPercent > 100) {
    return { ok: false, error: "Pass mark must be between 1 and 100" };
  }
  if (!Number.isInteger(input.maxAttemptsPerPeriod) || input.maxAttemptsPerPeriod < 1 || input.maxAttemptsPerPeriod > 10) {
    return { ok: false, error: "Attempts per period must be 1 to 10" };
  }
  if (input.questionsPerAttempt !== null) {
    const bank = await prisma.question.count({ where: { assessmentId: id } });
    if (input.questionsPerAttempt < 1 || input.questionsPerAttempt > bank) {
      return { ok: false, error: `Questions per attempt must be between 1 and ${bank}` };
    }
  }
  await writeWithAudit(
    (tx) => tx.assessment.update({ where: { id }, data: input }),
    () => ({ actorId: actor.id, action: "assessment.settings", entityType: "Assessment", entityId: id, after: { ...input } }),
  );
  return { ok: true, id };
}
