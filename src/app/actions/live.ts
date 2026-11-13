"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { prisma } from "../../lib/db/client";
import { markAttendance, registerForSession, scheduleSession } from "../../lib/learning/live-sessions";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

export async function scheduleSessionAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const lessonId = text(formData, "lessonId");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  const to = `/admin/courses/${lesson?.courseId ?? ""}`;
  const capacityText = text(formData, "capacity").trim();
  const result = await scheduleSession(actor, lessonId, {
    startsAt: new Date(text(formData, "startsAt")),
    endsAt: new Date(text(formData, "endsAt")),
    meetingUrl: text(formData, "meetingUrl"),
    capacity: capacityText === "" ? null : Number(capacityText),
    instructorIds: formData.getAll("instructorIds").map(String).filter(Boolean),
  });
  if (!result.ok) redirect(`${to}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(to);
  redirect(`${to}?notice=${encodeURIComponent("Session scheduled")}`);
}

export async function registerAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const sessionId = text(formData, "sessionId");
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId }, include: { lesson: true } });
  const to = `/learn/courses/${session?.lesson.courseId ?? ""}`;
  const result = await registerForSession(sessionId, actor.id);
  if (!result.ok) redirect(`${to}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(to);
  redirect(`${to}?notice=${encodeURIComponent("You are registered")}`);
}

export async function markAttendanceAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const sessionId = text(formData, "sessionId");
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId }, include: { lesson: true } });
  const to = `/admin/courses/${session?.lesson.courseId ?? ""}`;
  await markAttendance(sessionId, formData.getAll("attendeeIds").map(String), actor);
  revalidatePath(to);
  redirect(`${to}?notice=${encodeURIComponent("Attendance saved")}`);
}
