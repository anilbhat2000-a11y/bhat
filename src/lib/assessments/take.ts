import { prisma } from "../db/client";
import { AuthError } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { makeVerificationCode } from "../certificates/code";
import { recordAudit } from "../audit/record";
import { canStartAttempt, isWithinTimeLimit } from "./attempts";
import { expiresAt } from "./certifications";
import { scoreAttempt, shuffleOptions } from "./scoring";
import type { QuestionType } from "../../generated/prisma/client";

export type PublicQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  options: { id: string; label: string }[];
};

type Presented = { id: string; optionOrder: string[] };
type Option = { id: string; label: string };

function endOf(startedAt: Date, limitMinutes: number | null): Date | null {
  return limitMinutes === null ? null : new Date(startedAt.getTime() + limitMinutes * 60_000);
}

// Builds the learner's view: options in this attempt's order, and no answer key.
function toPublic(
  drawn: { id: string; type: QuestionType; text: string; points: number; options: unknown }[],
  presented: Presented[],
): PublicQuestion[] {
  return presented.map((p) => {
    const q = drawn.find((d) => d.id === p.id);
    if (!q) throw new Error("presented question missing");
    const byId = new Map((q.options as Option[]).map((o) => [o.id, o]));
    return {
      id: q.id,
      type: q.type,
      text: q.text,
      points: q.points,
      options: p.optionOrder.map((id) => byId.get(id) as Option),
    };
  });
}

// Starts an attempt, or resumes the in-progress one. The attempt row is written before
// any answer is given, so a dropped connection loses nothing.
export async function startAttempt(
  actor: SessionUser,
  periodId: string,
  opts: { now?: Date; rng?: () => number } = {},
): Promise<{ attemptId: string; questions: PublicQuestion[]; expiresAt: Date | null }> {
  const now = opts.now ?? new Date();
  const rng = opts.rng ?? Math.random;
  const period = await prisma.assessmentPeriod.findUnique({ where: { id: periodId }, include: { assessment: true } });
  if (!period) throw new Error("period not found");
  if (period.userId !== actor.id) throw new AuthError(403);
  if (!period.assessment.published) throw new Error("This assessment is not available");
  const limit = period.assessment.timeLimitMinutes;

  const inProgress = await prisma.assessmentAttempt.findFirst({
    where: { periodId, userId: actor.id, status: "IN_PROGRESS" },
  });
  if (inProgress) {
    const end = endOf(inProgress.startedAt, limit);
    if (!end || now.getTime() <= end.getTime()) {
      const drawn = await prisma.question.findMany({ where: { id: { in: (inProgress.presentedQuestions as Presented[]).map((p) => p.id) } } });
      return {
        attemptId: inProgress.id,
        questions: toPublic(drawn, inProgress.presentedQuestions as Presented[]),
        expiresAt: end,
      };
    }
    await prisma.assessmentAttempt.update({ where: { id: inProgress.id }, data: { status: "EXPIRED" } });
  }

  const attemptsSoFar = await prisma.assessmentAttempt.count({ where: { periodId, userId: actor.id } });
  if (period.status !== "OPEN") throw new Error("This period is closed");
  if (!canStartAttempt(attemptsSoFar, period.assessment.maxAttemptsPerPeriod, period.status)) {
    throw new Error("No attempts left: the attempt limit for this period is reached");
  }

  const all = await prisma.question.findMany({ where: { assessmentId: period.assessmentId }, orderBy: { position: "asc" } });
  const pool = period.assessment.questionsPerAttempt;
  const drawn = pool && pool < all.length ? shuffleOptions(all, rng).slice(0, pool) : all;
  const presented: Presented[] = drawn.map((q) => ({
    id: q.id,
    optionOrder: shuffleOptions((q.options as Option[]).map((o) => o.id), rng),
  }));

  const attempt = await prisma.assessmentAttempt.create({
    data: { periodId, userId: actor.id, status: "IN_PROGRESS", startedAt: now, presentedQuestions: presented },
  });
  return { attemptId: attempt.id, questions: toPublic(drawn, presented), expiresAt: endOf(now, limit) };
}

export async function submitAttempt(
  actor: SessionUser,
  attemptId: string,
  answers: Record<string, string[]>,
  opts: { now?: Date } = {},
): Promise<
  | { ok: true; scorePercent: number; passed: boolean; correct?: Record<string, string[]> }
  | { ok: false; error: string }
> {
  const now = opts.now ?? new Date();
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { period: { include: { assessment: { include: { subject: true } } } } },
  });
  if (!attempt) return { ok: false, error: "Attempt not found" };
  if (attempt.userId !== actor.id) throw new AuthError(403);
  if (attempt.status === "SUBMITTED") return { ok: false, error: "This attempt was already submitted" };
  if (attempt.status === "EXPIRED") return { ok: false, error: "This attempt ran out of time" };

  const assessment = attempt.period.assessment;
  if (!isWithinTimeLimit(attempt.startedAt, now, assessment.timeLimitMinutes)) {
    await prisma.assessmentAttempt.update({ where: { id: attemptId }, data: { status: "EXPIRED" } });
    return { ok: false, error: "Time limit passed. This attempt was not scored." };
  }

  const presented = attempt.presentedQuestions as Presented[];
  const questions = await prisma.question.findMany({ where: { id: { in: presented.map((p) => p.id) } } });
  const scoring = scoreAttempt(
    questions.map((q) => ({ id: q.id, type: q.type, correctOptionIds: q.correctOptionIds as string[], points: q.points })),
    answers,
    assessment.passMarkPercent,
  );

  await prisma.$transaction(async (tx) => {
    await tx.assessmentAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: now, scorePercent: scoring.scorePercent, passed: scoring.passed, answers },
    });
    await recordAudit(tx, {
      actorId: actor.id,
      action: "attempt.submit",
      entityType: "AssessmentAttempt",
      entityId: attemptId,
      after: { scorePercent: scoring.scorePercent, passed: scoring.passed },
    });
    if (scoring.passed) {
      await tx.assessmentPeriod.update({ where: { id: attempt.periodId }, data: { status: "PASSED" } });
      const cert = await tx.certification.create({
        data: {
          userId: actor.id,
          subjectId: assessment.subjectId,
          level: assessment.level,
          issuedAt: now,
          expiresAt: expiresAt(now, assessment.subject.certificationValidityMonths),
          sourceAttemptId: attemptId,
          verificationCode: makeVerificationCode(),
        },
      });
      await recordAudit(tx, { actorId: actor.id, action: "certificate.issue", entityType: "Certification", entityId: cert.id, after: { subjectId: assessment.subjectId, level: assessment.level } });
    }
  });

  const correct = assessment.showAnswersAfterSubmit
    ? Object.fromEntries(questions.map((q) => [q.id, q.correctOptionIds as string[]]))
    : undefined;
  return { ok: true, scorePercent: scoring.scorePercent, passed: scoring.passed, correct };
}

// What the learner sees for their own attempt: the questions while it is in progress,
// or the result once it is submitted. Anyone else gets AuthError(403).
export async function attemptForUser(actor: SessionUser, attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { period: { include: { assessment: true } } },
  });
  if (!attempt) return null;
  if (attempt.userId !== actor.id) throw new AuthError(403);
  const presented = attempt.presentedQuestions as Presented[];
  const drawn = await prisma.question.findMany({ where: { id: { in: presented.map((p) => p.id) } } });
  const questions = attempt.status === "IN_PROGRESS" ? toPublic(drawn, presented) : [];
  // The answer key is shown only after a submit, and only when the admin enabled it.
  const showKey = attempt.status === "SUBMITTED" && attempt.period.assessment.showAnswersAfterSubmit;
  return {
    status: attempt.status,
    title: attempt.period.assessment.title,
    questions,
    correctOptionIds: showKey
      ? Object.fromEntries(drawn.map((q) => [q.id, q.correctOptionIds as string[]]))
      : undefined,
    answerKey: showKey
      ? drawn.map((q) => {
          const labels = new Map((q.options as Option[]).map((o) => [o.id, o.label]));
          return { text: q.text, correct: (q.correctOptionIds as string[]).map((id) => labels.get(id) ?? id) };
        })
      : undefined,
    scorePercent: attempt.scorePercent,
    passed: attempt.passed,
    expiresAt: endOf(attempt.startedAt, attempt.period.assessment.timeLimitMinutes),
  };
}

// Question ids this attempt was given, so the submit form can read exactly those answers.
export async function presentedQuestionIds(attemptId: string): Promise<string[]> {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
  return ((attempt?.presentedQuestions as Presented[] | undefined) ?? []).map((p) => p.id);
}
