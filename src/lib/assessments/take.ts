import { prisma } from "../db/client";
import { AuthError } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { makeVerificationCode } from "../certificates/code";
import { recordAudit } from "../audit/record";
import { canStartAttempt, isWithinTimeLimit } from "./attempts";
import { expiresAt } from "./certifications";
import { openRemedial, remedialBlock } from "./remedial";
import { scoreAttempt, shuffleOptions, type ScoringQuestion } from "./scoring";
import type { Level, QuestionType } from "../../generated/prisma/client";

export type PublicQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  scenario: string | null;
  // Choice questions: options in this attempt's order. Matching: the left-hand items.
  // Fill-in-the-blank and short answer: empty, so accepted answers never reach the browser.
  options: { id: string; label: string }[];
  // Matching only: the right-hand items, in this attempt's order.
  choices?: { id: string; label: string }[];
};

type Presented = { id: string; optionOrder: string[] };

class AlreadySubmitted extends Error {}
type Option = { id: string; label: string; match?: string };
type DrawnQuestion = { id: string; type: QuestionType; text: string; points: number; options: unknown; scenario: string | null };

function endOf(startedAt: Date, limitMinutes: number | null): Date | null {
  return limitMinutes === null ? null : new Date(startedAt.getTime() + limitMinutes * 60_000);
}

// Builds the learner's view, in this attempt's order and without the answer key.
function toPublic(drawn: DrawnQuestion[], presented: Presented[]): PublicQuestion[] {
  return presented.map((p) => {
    const q = drawn.find((d) => d.id === p.id);
    if (!q) throw new Error("presented question missing");
    const options = q.options as Option[];
    const byId = new Map(options.map((o) => [o.id, o]));
    const base = { id: q.id, type: q.type, text: q.text, points: q.points, scenario: q.scenario };
    if (q.type === "FILL_BLANK" || q.type === "SHORT_ANSWER") return { ...base, options: [] };
    if (q.type === "MATCHING") {
      return {
        ...base,
        options: options.map((o) => ({ id: o.id, label: o.label })),
        choices: p.optionOrder.map((id) => ({ id, label: byId.get(id)?.match ?? "" })),
      };
    }
    return { ...base, options: p.optionOrder.map((id) => ({ id, label: (byId.get(id) as Option).label })) };
  });
}

// The questions the attempt was given, in scoring form.
function toScoring(questions: { id: string; type: QuestionType; correctOptionIds: unknown; points: number; options: unknown }[]): ScoringQuestion[] {
  return questions.map((q) => ({
    id: q.id, type: q.type, correctOptionIds: q.correctOptionIds as string[], points: q.points, options: q.options as Option[],
  }));
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// What a final result does: on a pass the period is passed and a certificate is issued.
// Shared by automatic marking at submit and by a reviewer's grading.
export async function applyResult(
  tx: Tx,
  input: { attemptId: string; periodId: string; userId: string; actorId: string; passed: boolean; now: Date;
    assessment: { id: string; subjectId: string; level: Level; courseId: string | null; retakeDelayHours: number; subject: { certificationValidityMonths: number } } },
): Promise<void> {
  if (!input.passed) {
    await onFail(tx, input);
    return;
  }
  await tx.assessmentPeriod.update({ where: { id: input.periodId }, data: { status: "PASSED" } });
  if (input.assessment.courseId) await completeCourseOnPass(tx, input.userId, input.assessment.courseId, input.now);
  const cert = await tx.certification.create({
    data: {
      userId: input.userId,
      subjectId: input.assessment.subjectId,
      level: input.assessment.level,
      issuedAt: input.now,
      expiresAt: expiresAt(input.now, input.assessment.subject.certificationValidityMonths),
      sourceAttemptId: input.attemptId,
      verificationCode: makeVerificationCode(),
    },
  });
  await recordAudit(tx, { actorId: input.actorId, action: "certificate.issue", entityType: "Certification", entityId: cert.id, after: { userId: input.userId, subjectId: input.assessment.subjectId, level: input.assessment.level } });
}

// A course that needs its assessment passed completes now, if every lesson is already done.
async function completeCourseOnPass(tx: Tx, userId: string, courseId: string, now: Date): Promise<void> {
  const course = await tx.course.findUnique({ where: { id: courseId }, select: { requireAssessmentPass: true, lessons: { select: { id: true } } } });
  if (!course?.requireAssessmentPass) return;
  const progress = await tx.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!progress || progress.completedAt) return;
  const done = new Set((progress.completedLessonIds as string[] | null) ?? []);
  if (course.lessons.length > 0 && course.lessons.every((l) => done.has(l.id))) {
    await tx.courseProgress.update({ where: { id: progress.id }, data: { completedAt: now } });
  }
}

// A failed result starts the remedial path: lessons again, then a scheduled retake.
async function onFail(tx: Tx, input: Parameters<typeof applyResult>[1]): Promise<void> {
  await openRemedial(tx, {
    userId: input.userId, actorId: input.actorId, attemptId: input.attemptId, periodId: input.periodId, now: input.now,
    assessment: { id: input.assessment.id, courseId: input.assessment.courseId, retakeDelayHours: input.assessment.retakeDelayHours },
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

  // Voided attempts (an admin reset) stay on record but no longer count toward the limit.
  const attemptsSoFar = await prisma.assessmentAttempt.count({ where: { periodId, userId: actor.id, status: { not: "VOIDED" } } });
  if (period.status !== "OPEN" || now.getTime() > period.dueAt.getTime()) throw new Error("This period is closed");
  if (!canStartAttempt(attemptsSoFar, period.assessment.maxAttemptsPerPeriod, period.status)) {
    throw new Error("No attempts left: the attempt limit for this period is reached");
  }
  const blocked = await remedialBlock(actor.id, period.assessmentId, now);
  if (blocked) throw new Error(blocked);

  const all = await prisma.question.findMany({ where: { assessmentId: period.assessmentId }, orderBy: { position: "asc" } });
  const pool = period.assessment.questionsPerAttempt;
  const drawn = pool && pool < all.length ? shuffleOptions(all, rng).slice(0, pool) : all;
  const presented: Presented[] = drawn.map((q) => ({
    id: q.id,
    optionOrder: q.type === "FILL_BLANK" || q.type === "SHORT_ANSWER" ? [] : shuffleOptions((q.options as Option[]).map((o) => o.id), rng),
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
  | { ok: true; scorePercent: number | null; passed: boolean | null; awaitingGrading: boolean; correct?: Record<string, string[]> }
  | { ok: false; error: string }
> {
  const now = opts.now ?? new Date();
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { period: { include: { assessment: { include: { subject: true } } } } },
  });
  if (!attempt) return { ok: false, error: "Attempt not found" };
  if (attempt.userId !== actor.id) throw new AuthError(403);
  if (attempt.status === "SUBMITTED" || attempt.status === "AWAITING_GRADING") return { ok: false, error: "This attempt was already submitted" };
  if (attempt.status === "EXPIRED") return { ok: false, error: "This attempt ran out of time" };

  const assessment = attempt.period.assessment;
  // A submit after the period's due time is not scored, whatever the attempt's own limit.
  if (now.getTime() > attempt.period.dueAt.getTime()) {
    await prisma.assessmentAttempt.update({ where: { id: attemptId }, data: { status: "EXPIRED" } });
    return { ok: false, error: "The period closed before this submit. The attempt was not scored." };
  }
  if (!isWithinTimeLimit(attempt.startedAt, now, assessment.timeLimitMinutes)) {
    await prisma.assessmentAttempt.update({ where: { id: attemptId }, data: { status: "EXPIRED" } });
    return { ok: false, error: "Time limit passed. This attempt was not scored." };
  }

  const presented = attempt.presentedQuestions as Presented[];
  const questions = await prisma.question.findMany({ where: { id: { in: presented.map((p) => p.id) } } });
  const scoring = scoreAttempt(toScoring(questions), answers, assessment.passMarkPercent);
  const awaitingGrading = scoring.pendingManual.length > 0;

  try {
    await prisma.$transaction(async (tx) => {
      // Claim the attempt first: only one submit can move it out of IN_PROGRESS, so a
      // double submit cannot issue two certificates.
      const claim = await tx.assessmentAttempt.updateMany({
        where: { id: attemptId, status: "IN_PROGRESS" },
        data: {
          status: awaitingGrading ? "AWAITING_GRADING" : "SUBMITTED",
          submittedAt: now,
          scorePercent: scoring.scorePercent,
          passed: scoring.passed,
          answers,
        },
      });
      if (claim.count !== 1) throw new AlreadySubmitted();
      await recordAudit(tx, {
        actorId: actor.id,
        action: "attempt.submit",
        entityType: "AssessmentAttempt",
        entityId: attemptId,
        after: { scorePercent: scoring.scorePercent, passed: scoring.passed, awaitingGrading },
      });
      if (!awaitingGrading) {
        await applyResult(tx, {
          attemptId, periodId: attempt.periodId, userId: actor.id, actorId: actor.id, passed: scoring.passed === true, now, assessment,
        });
      }
    });
  } catch (e) {
    if (e instanceof AlreadySubmitted) return { ok: false, error: "This attempt was already submitted" };
    throw e;
  }

  const correct = assessment.showAnswersAfterSubmit && !awaitingGrading
    ? Object.fromEntries(questions.map((q) => [q.id, q.correctOptionIds as string[]]))
    : undefined;
  return { ok: true, scorePercent: scoring.scorePercent, passed: scoring.passed, awaitingGrading, correct };
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
  const given = (attempt.answers as Record<string, string[]> | null) ?? {};
  const grades = (attempt.manualGrades as Record<string, { points: number; note?: string }> | null) ?? {};
  const order = new Map(presented.map((p, i) => [p.id, i]));
  return {
    status: attempt.status,
    title: attempt.period.assessment.title,
    proctored: attempt.period.assessment.proctored,
    proctorMaxViolations: attempt.period.assessment.proctorMaxViolations,
    violations: ((attempt.proctorEvents as unknown[] | null) ?? []).length,
    questions,
    correctOptionIds: showKey
      ? Object.fromEntries(drawn.map((q) => [q.id, q.correctOptionIds as string[]]))
      : undefined,
    answerKey: showKey
      ? [...drawn].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).map((q) => ({
          text: q.text,
          correct: describeCorrect(q.type, q.options as Option[], q.correctOptionIds as string[]),
          yourAnswer: describeAnswer(q.type, q.options as Option[], given[q.id] ?? []),
          explanation: q.explanation,
          reviewerNote: grades[q.id]?.note ?? null,
        }))
      : undefined,
    reviewerNote: attempt.status === "SUBMITTED" ? attempt.reviewerNote : null,
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

// The correct answer in words, for the answer key.
export function describeCorrect(type: QuestionType, options: Option[], correctIds: string[]): string[] {
  if (type === "SHORT_ANSWER") return ["Marked by a reviewer"];
  if (type === "FILL_BLANK") return options.map((o) => o.label);
  if (type === "MATCHING") return options.map((o) => `${o.label} → ${o.match}`);
  const labels = new Map(options.map((o) => [o.id, o.label]));
  return correctIds.map((id) => labels.get(id) ?? id);
}

// What the learner answered, in words.
export function describeAnswer(type: QuestionType, options: Option[], given: string[]): string[] {
  if (type === "FILL_BLANK" || type === "SHORT_ANSWER") return given.filter((g) => g.trim());
  const byId = new Map(options.map((o) => [o.id, o]));
  if (type === "MATCHING") {
    return given.map((pair) => {
      const [left, right] = pair.split("=");
      return `${byId.get(left)?.label ?? "?"} → ${byId.get(right)?.match ?? "?"}`;
    });
  }
  return given.map((id) => byId.get(id)?.label ?? id);
}
