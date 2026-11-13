import { prisma } from "../db/client";
import { AuthError, canViewUser, requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { completeLessonForUser } from "./progress";
import { recordAudit } from "../audit/record";

export type Result = { ok: true; id?: string } | { ok: false; error: string };

export async function scheduleSession(
  actor: SessionUser,
  lessonId: string,
  input: { startsAt: Date; endsAt: Date; meetingUrl: string; capacity: number | null; instructorIds: string[] },
): Promise<Result> {
  requireRole(actor, ["ADMIN"]);
  if (input.endsAt.getTime() <= input.startsAt.getTime()) return { ok: false, error: "The session must end after it starts" };
  if (!/^https?:\/\/\S+$/i.test(input.meetingUrl)) return { ok: false, error: "Enter a full http or https meeting link" };
  if (input.capacity !== null && (!Number.isInteger(input.capacity) || input.capacity < 0)) {
    return { ok: false, error: "Capacity must be a whole number, or empty for no limit" };
  }
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.type !== "LIVE_SESSION") return { ok: false, error: "Only live session lessons can be scheduled" };

  const data = {
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    meetingUrl: input.meetingUrl,
    capacity: input.capacity,
  };
  const session = await prisma.$transaction(async (tx) => {
    const row = await tx.liveSession.upsert({ where: { lessonId }, update: data, create: { lessonId, ...data } });
    await tx.lessonInstructor.deleteMany({ where: { lessonId } });
    await tx.lessonInstructor.createMany({
      data: input.instructorIds.map((instructorId) => ({ lessonId, instructorId })),
      skipDuplicates: true,
    });
    await recordAudit(tx, { actorId: actor.id, action: "session.schedule", entityType: "LiveSession", entityId: row.id, after: { ...data, instructors: input.instructorIds.length } });
    return row;
  });
  return { ok: true, id: session.id };
}

// Capacity null means unlimited; capacity 0 means no places. A full session refuses the next.
// The session row is locked first, so two registrations for the last place queue up.
export async function registerForSession(sessionId: string, userId: string, now: Date = new Date()): Promise<Result> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM live_sessions WHERE id = ${sessionId} FOR UPDATE`;
    const session = await tx.liveSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { registrations: true } } },
    });
    if (!session) return { ok: false, error: "Session not found" } as Result;
    if (now.getTime() >= session.endsAt.getTime()) return { ok: false, error: "This session has ended" } as Result;
    const existing = await tx.liveSessionRegistration.findUnique({
      where: { liveSessionId_userId: { liveSessionId: sessionId, userId } },
    });
    if (existing) return { ok: false, error: "You are already registered for this session" } as Result;
    if (session.capacity !== null && session._count.registrations >= session.capacity) {
      return { ok: false, error: "This session is full" } as Result;
    }
    const row = await tx.liveSessionRegistration.create({ data: { liveSessionId: sessionId, userId } });
    return { ok: true, id: row.id } as Result;
  });
}

// Admins can mark anyone. Managers can mark only their reporting line, never themselves.
// Attendance completes the lesson for each attendee, under the usual order rule.
export async function markAttendance(sessionId: string, attendeeIds: string[], actor: SessionUser): Promise<void> {
  requireRole(actor, ["ADMIN", "MANAGER"]);
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("session not found");
  const users = await prisma.user.findMany({ select: { id: true, managerId: true } });
  for (const id of attendeeIds) {
    if (actor.role !== "ADMIN" && (id === actor.id || !canViewUser(actor, id, users))) throw new AuthError(403);
  }
  await prisma.$transaction(async (tx) => {
    // Recording attendance also books the person if they were not registered.
    for (const userId of attendeeIds) {
      await tx.liveSessionRegistration.upsert({
        where: { liveSessionId_userId: { liveSessionId: sessionId, userId } },
        create: { liveSessionId: sessionId, userId, attended: true },
        update: { attended: true },
      });
    }
    await recordAudit(tx, { actorId: actor.id, action: "session.attendance", entityType: "LiveSession", entityId: sessionId, after: { attendeeIds } });
  });
  for (const id of attendeeIds) {
    // An attendee who has not finished earlier lessons keeps the attendance; the lesson
    // completes once the order allows it.
    await completeLessonForUser(id, session.lessonId);
  }
}
