import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { recordAudit } from "../audit/record";
import { isManual, scoreAttempt, type ScoringQuestion } from "./scoring";
import { applyResult, describeAnswer, describeCorrect } from "./take";
import type { QuestionType } from "../../generated/prisma/client";

// Short answers are marked by admins (L&D). A reviewer cannot grade their own attempt.
const asReviewer = (actor: SessionUser) => requireRole(actor, ["ADMIN"]);

type Option = { id: string; label: string; match?: string };
type Presented = { id: string; optionOrder: string[] };

export type Mark = { points: number; note?: string };

// Oldest first, so nobody waits longest.
export async function gradingQueue(actor: SessionUser) {
  asReviewer(actor);
  const rows = await prisma.assessmentAttempt.findMany({
    where: { status: "AWAITING_GRADING" },
    orderBy: { submittedAt: "asc" },
    include: { user: { select: { name: true, department: true } }, period: { include: { assessment: { select: { title: true } } } } },
  });
  return rows.map((a) => ({
    id: a.id,
    learner: a.user.name,
    department: a.user.department,
    assessment: a.period.assessment.title,
    periodKey: a.period.periodKey,
    submittedAt: a.submittedAt,
    canGrade: a.userId !== actor.id,
  }));
}

// Everything a reviewer needs: each question with the learner's answer, whether objective
// answers were right, and the model answer (explanation) for short answers.
export async function attemptForGrading(actor: SessionUser, attemptId: string) {
  asReviewer(actor);
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { user: { select: { name: true } }, period: { include: { assessment: true } } },
  });
  if (!attempt) return null;
  const presented = attempt.presentedQuestions as Presented[];
  const questions = await prisma.question.findMany({ where: { id: { in: presented.map((p) => p.id) } } });
  const byId = new Map(questions.map((q) => [q.id, q]));
  const answers = (attempt.answers as Record<string, string[]> | null) ?? {};
  const scoring = scoreAttempt(questions.map(toScoring), answers, attempt.period.assessment.passMarkPercent);
  return {
    id: attempt.id,
    status: attempt.status,
    learner: attempt.user.name,
    ownAttempt: attempt.userId === actor.id,
    assessment: attempt.period.assessment.title,
    passMarkPercent: attempt.period.assessment.passMarkPercent,
    items: presented.flatMap((p) => {
      const q = byId.get(p.id);
      if (!q) return [];
      const options = q.options as Option[];
      return [{
        id: q.id,
        type: q.type as QuestionType,
        text: q.text,
        scenario: q.scenario,
        points: q.points,
        manual: isManual(q.type),
        answer: describeAnswer(q.type, options, answers[q.id] ?? []),
        correct: isManual(q.type) ? null : scoring.perQuestion[q.id] ?? false,
        expected: describeCorrect(q.type, options, q.correctOptionIds as string[]),
        modelAnswer: q.explanation,
      }];
    }),
  };
}

function toScoring(q: { id: string; type: QuestionType; correctOptionIds: unknown; points: number; options: unknown }): ScoringQuestion {
  return { id: q.id, type: q.type, correctOptionIds: q.correctOptionIds as string[], points: q.points, options: q.options as Option[] };
}

// Records the reviewer's marks, finalises the score, and applies the result (certificate
// on a pass). Every short answer needs a whole-number mark from 0 to its points.
// The attempt was submitted in time, so a pass counts even if the period has since gone
// overdue while it waited in the queue.
export async function gradeAttempt(
  actor: SessionUser,
  attemptId: string,
  marks: Record<string, Mark>,
  reviewerNote: string,
  now: Date = new Date(),
): Promise<{ ok: true; scorePercent: number; passed: boolean } | { ok: false; error: string }> {
  asReviewer(actor);
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { period: { include: { assessment: { include: { subject: true } } } } },
  });
  if (!attempt) return { ok: false, error: "Attempt not found" };
  if (attempt.userId === actor.id) return { ok: false, error: "You cannot grade your own attempt" };
  if (attempt.status !== "AWAITING_GRADING") return { ok: false, error: "This attempt is not waiting for grading" };

  const presented = attempt.presentedQuestions as Presented[];
  const questions = await prisma.question.findMany({ where: { id: { in: presented.map((p) => p.id) } } });
  const manual: Record<string, number> = {};
  for (const q of questions.filter((x) => isManual(x.type))) {
    const mark = marks[q.id];
    if (!mark || !Number.isInteger(mark.points) || mark.points < 0 || mark.points > q.points) {
      return { ok: false, error: `Give "${q.text.slice(0, 60)}" a whole-number mark from 0 to ${q.points}` };
    }
    manual[q.id] = mark.points;
  }
  const assessment = attempt.period.assessment;
  const scoring = scoreAttempt(questions.map(toScoring), (attempt.answers as Record<string, string[]> | null) ?? {}, assessment.passMarkPercent, manual);
  if (scoring.scorePercent === null || scoring.passed === null) return { ok: false, error: "Some answers are still unmarked" };
  const scorePercent = scoring.scorePercent;
  const passed = scoring.passed;
  const stored = Object.fromEntries(Object.entries(manual).map(([id, points]) => [id, { points, note: marks[id]?.note?.trim() || undefined }]));

  const claimed = await prisma.$transaction(async (tx) => {
    // Only one reviewer's grading can move the attempt out of the queue.
    const claim = await tx.assessmentAttempt.updateMany({
      where: { id: attemptId, status: "AWAITING_GRADING" },
      data: {
        status: "SUBMITTED", scorePercent, passed, manualGrades: stored,
        reviewerNote: reviewerNote.trim() || null, gradedById: actor.id, gradedAt: now,
      },
    });
    if (claim.count !== 1) return false;
    await recordAudit(tx, {
      actorId: actor.id, action: "attempt.grade", entityType: "AssessmentAttempt", entityId: attemptId,
      after: { scorePercent, passed, marks: stored },
    });
    await applyResult(tx, { attemptId, periodId: attempt.periodId, userId: attempt.userId, actorId: actor.id, passed, now, assessment });
    return true;
  });
  if (!claimed) return { ok: false, error: "Another reviewer has just graded this attempt" };
  return { ok: true, scorePercent, passed };
}
