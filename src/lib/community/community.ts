import { hiddenCourseIds } from "../learning/audience";
import { prisma } from "../db/client";
import { AuthError, requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import type { Mailer } from "../notifications/mailer";
import { recordAudit } from "../audit/record";
import { learnerCanOpen } from "../learning/modules";

export type Result = { ok: true; id?: string; emailed?: number } | { ok: false; error: string };

// --- Announcements ------------------------------------------------------------------------

// Admins post announcements to everyone or one department. With a mailer, each active
// person in the audience is also emailed through the company SMTP server.
export async function createAnnouncement(
  actor: SessionUser,
  input: { title: string; body: string; department?: string | null },
  mailer?: Mailer,
): Promise<Result> {
  requireRole(actor, ["ADMIN"]);
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) return { ok: false, error: "Title and message are required" };
  if (title.length > 200 || body.length > 5000) return { ok: false, error: "Keep the title under 200 and the message under 5000 characters" };
  const department = input.department?.trim() || null;
  const a = await prisma.$transaction(async (tx) => {
    const row = await tx.announcement.create({ data: { title, body, audience: department ? "DEPARTMENT" : "ALL", department, createdById: actor.id } });
    await recordAudit(tx, { actorId: actor.id, action: "announcement.create", entityType: "Announcement", entityId: row.id, after: { title, department } });
    return row;
  });
  let emailed = 0;
  if (mailer) {
    const people = await prisma.user.findMany({ where: { active: true, ...(department ? { department } : {}) }, select: { email: true } });
    for (const p of people) {
      try {
        await mailer.send(p.email, `[3C LMS] ${title}`, body);
        emailed++;
      } catch {
        // One undeliverable address must not stop the rest.
      }
    }
    await prisma.announcement.update({ where: { id: a.id }, data: { emailedAt: new Date() } });
  }
  return { ok: true, id: a.id, emailed };
}

// The latest announcements a person can see: everyone's, plus their department's.
export async function announcementsFor(user: { department: string | null }, take = 5) {
  return prisma.announcement.findMany({
    where: { OR: [{ audience: "ALL" }, ...(user.department ? [{ audience: "DEPARTMENT" as const, department: user.department }] : [])] },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function deleteAnnouncement(actor: SessionUser, id: string): Promise<Result> {
  requireRole(actor, ["ADMIN"]);
  const a = await prisma.announcement.findUnique({ where: { id } });
  if (!a) return { ok: false, error: "Announcement not found" };
  await prisma.$transaction(async (tx) => {
    await tx.announcement.delete({ where: { id } });
    await recordAudit(tx, { actorId: actor.id, action: "announcement.delete", entityType: "Announcement", entityId: id, before: { title: a.title } });
  });
  return { ok: true, id };
}

// --- Course feedback survey ---------------------------------------------------------------

// One response per learner and course, after they finish it. A second response replaces
// the first.
export async function submitFeedback(actor: SessionUser, courseId: string, input: { rating: number; comment?: string }): Promise<Result> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { ok: false, error: "Choose a rating from 1 to 5" };
  const progress = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: actor.id, courseId } } });
  if (!progress?.completedAt) return { ok: false, error: "Finish the course before giving feedback" };
  const comment = input.comment?.trim().slice(0, 2000) || null;
  const row = await prisma.courseFeedback.upsert({
    where: { courseId_userId: { courseId, userId: actor.id } },
    update: { rating: input.rating, comment },
    create: { courseId, userId: actor.id, rating: input.rating, comment },
  });
  return { ok: true, id: row.id };
}

export async function feedbackSummary(courseId: string) {
  const rows = await prisma.courseFeedback.findMany({ where: { courseId }, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } });
  const average = rows.length === 0 ? null : Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10;
  return { count: rows.length, average, comments: rows.filter((r) => r.comment).map((r) => ({ name: r.user.name, rating: r.rating, comment: r.comment as string, at: r.createdAt })) };
}

// --- Course Q&A ---------------------------------------------------------------------------

// Anyone who can open the course reads and posts. Admins moderate: they can hide any post.
// Hidden posts are kept (for the audit trail) but shown only to admins.
async function canUseCourse(actor: SessionUser, courseId: string): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { status: true } });
  if (!course) return false;
  const started = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: actor.id, courseId } }, select: { id: true } });
  return learnerCanOpen(course.status, started !== null);
}

export async function addPost(actor: SessionUser, courseId: string, input: { body: string; parentId?: string | null }): Promise<Result> {
  if (!(await canUseCourse(actor, courseId))) throw new AuthError(403);
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Write your question or answer" };
  if (body.length > 4000) return { ok: false, error: "Keep posts under 4000 characters" };
  if (input.parentId) {
    const parent = await prisma.coursePost.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.courseId !== courseId || parent.parentId !== null || parent.hidden) return { ok: false, error: "That question is not available" };
  }
  const row = await prisma.coursePost.create({ data: { courseId, userId: actor.id, body, parentId: input.parentId || null } });
  return { ok: true, id: row.id };
}

export async function setPostHidden(actor: SessionUser, postId: string, hidden: boolean): Promise<Result> {
  requireRole(actor, ["ADMIN"]);
  const post = await prisma.coursePost.findUnique({ where: { id: postId } });
  if (!post) return { ok: false, error: "Post not found" };
  await prisma.$transaction(async (tx) => {
    await tx.coursePost.update({ where: { id: postId }, data: { hidden } });
    await recordAudit(tx, { actorId: actor.id, action: hidden ? "post.hide" : "post.show", entityType: "CoursePost", entityId: postId, before: { body: post.body.slice(0, 200), authorId: post.userId } });
  });
  return { ok: true, id: postId };
}

export async function threadsFor(actor: SessionUser, courseId: string) {
  if (!(await canUseCourse(actor, courseId))) throw new AuthError(403);
  const visible = actor.role === "ADMIN" ? {} : { hidden: false };
  return prisma.coursePost.findMany({
    where: { courseId, parentId: null, ...visible },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, role: true } },
      replies: { where: visible, orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, role: true } } } },
    },
  });
}

// --- Search -------------------------------------------------------------------------------

// Searches course titles and descriptions, lesson titles and text, and (for admins) the
// question bank. Learners see published courses only. Case-insensitive substring match;
// the term is passed as a parameter, never built into SQL.
export async function search(actor: SessionUser, term: string, take = 20) {
  const q = term.trim();
  if (q.length < 2) return { courses: [], lessons: [], questions: [] };
  // Prisma passes the value to LIKE as is, so % and _ would act as wildcards; escape them
  // (and the escape character) so they match literally.
  const contains = { contains: q.replace(/[\\%_]/g, (c) => `\\${c}`), mode: "insensitive" as const };
  const hidden = [...(await hiddenCourseIds(actor))];
  const published = actor.role === "ADMIN" ? {} : { status: "PUBLISHED" as const, id: { notIn: hidden } };
  const [courses, lessons, questions] = await Promise.all([
    prisma.course.findMany({
      where: { ...published, OR: [{ title: contains }, { description: contains }, { subject: { name: contains } }] },
      select: { id: true, title: true, level: true, status: true, subject: { select: { name: true } } },
      take,
    }),
    prisma.lesson.findMany({
      where: { course: published, OR: [{ title: contains }, { body: contains }] },
      select: { id: true, title: true, courseId: true, course: { select: { title: true } } },
      take,
    }),
    actor.role === "ADMIN"
      ? prisma.question.findMany({ where: { OR: [{ text: contains }, { scenario: contains }] }, select: { id: true, text: true, assessmentId: true, assessment: { select: { title: true } } }, take })
      : Promise.resolve([]),
  ]);
  return { courses, lessons, questions };
}
