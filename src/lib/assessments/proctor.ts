import { prisma } from "../db/client";
import { AuthError } from "../auth/guards";
import type { SessionUser } from "../auth/session";

export const PROCTOR_EVENTS = ["fullscreen-exit", "tab-hidden"] as const;
export type ProctorEventType = (typeof PROCTOR_EVENTS)[number];

// Records a full-screen exit or tab switch on the learner's own in-progress attempt of a
// proctored assessment. Returns the running count and whether the limit is reached, at
// which point the browser submits the attempt as it stands. Events on anything else are
// ignored, so a stray request cannot change a finished attempt.
export async function recordProctorEvent(
  actor: SessionUser,
  attemptId: string,
  type: string,
  now: Date = new Date(),
): Promise<{ recorded: boolean; count: number; limit: number; mustSubmit: boolean }> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { period: { include: { assessment: { select: { proctored: true, proctorMaxViolations: true } } } } },
  });
  if (!attempt) return { recorded: false, count: 0, limit: 0, mustSubmit: false };
  if (attempt.userId !== actor.id) throw new AuthError(403);
  const { proctored, proctorMaxViolations: limit } = attempt.period.assessment;
  const events = (attempt.proctorEvents as { type: string; at: string }[] | null) ?? [];
  if (!proctored || attempt.status !== "IN_PROGRESS" || !PROCTOR_EVENTS.includes(type as ProctorEventType)) {
    return { recorded: false, count: events.length, limit, mustSubmit: false };
  }
  const next = [...events, { type, at: now.toISOString() }];
  // Only an in-progress attempt is updated, so a submit racing this request wins.
  const updated = await prisma.assessmentAttempt.updateMany({
    where: { id: attemptId, status: "IN_PROGRESS" },
    data: { proctorEvents: next },
  });
  const count = updated.count === 1 ? next.length : events.length;
  return { recorded: updated.count === 1, count, limit, mustSubmit: count >= limit };
}
