import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import type { Mailer } from "../notifications/mailer";
import { completeLessonForUser } from "../learning/progress";
import {
  addPost, announcementsFor, createAnnouncement, deleteAnnouncement, feedbackSummary, search, setPostHidden, submitFeedback, threadsFor,
} from "./community";

const tag = `community-${Date.now()}`;
let admin: SessionUser;
let learner: SessionUser;
let other: SessionUser;
let subjectId: string;
let courseId: string;
let draftId: string;
let lessonId: string;

const mk = async (name: string, role: "ADMIN" | "EMPLOYEE", department?: string): Promise<SessionUser> => {
  const u = await prisma.user.create({ data: { name, email: `${tag}-${name}@example.test`, passwordHash: "x", role, department } });
  return { id: u.id, role, active: true, name, email: u.email, department: department ?? null };
};

beforeAll(async () => {
  admin = await mk("admin", "ADMIN");
  learner = await mk("learner", "EMPLOYEE", `${tag}-dept`);
  other = await mk("other", "EMPLOYEE", `${tag}-elsewhere`);
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "TECHNICAL" } })).id;
  const c = await prisma.course.create({
    data: { subjectId, title: `${tag} Zebra routing course`, description: "VLAN design", level: "BASIC", passMarkPercent: 70, status: "PUBLISHED",
      lessons: { create: { position: 1, title: "Spanning tree basics", type: "TEXT", body: `${tag} loops are bad` } } },
    include: { lessons: true },
  });
  courseId = c.id;
  lessonId = c.lessons[0].id;
  draftId = (await prisma.course.create({ data: { subjectId, title: `${tag} Zebra draft`, level: "BASIC", passMarkPercent: 70 } })).id;
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
  await prisma.announcement.deleteMany({ where: { createdById: admin.id } });
  await prisma.course.deleteMany({ where: { subjectId } });
  await prisma.subject.delete({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("announcements", () => {
  it("posts to a department, emails only that department, and shows it only there", async () => {
    const sent: string[] = [];
    const mailer: Mailer = { send: async (to) => { sent.push(to); } };
    const r = await createAnnouncement(admin, { title: "New course", body: "Networking Basic is live.", department: `${tag}-dept` }, mailer);
    expect(r).toMatchObject({ ok: true, emailed: 1 });
    expect(sent).toEqual([learner.email]);
    expect((await announcementsFor(learner)).some((a) => a.id === (r.ok && r.id))).toBe(true);
    expect((await announcementsFor(other)).some((a) => a.id === (r.ok && r.id))).toBe(false);
    expect((await deleteAnnouncement(admin, (r.ok && r.id) || "")).ok).toBe(true);
  });

  it("is admin-only and needs a title and message", async () => {
    await expect(createAnnouncement(learner, { title: "x", body: "y" })).rejects.toThrow();
    expect(await createAnnouncement(admin, { title: " ", body: "y" })).toMatchObject({ ok: false });
  });
});

describe("course feedback", () => {
  it("is accepted only after the course is finished, one response per learner", async () => {
    expect(await submitFeedback(learner, courseId, { rating: 5 })).toMatchObject({ ok: false });
    await completeLessonForUser(learner.id, lessonId);
    expect(await submitFeedback(learner, courseId, { rating: 0 })).toMatchObject({ ok: false });
    expect((await submitFeedback(learner, courseId, { rating: 3, comment: "Good" })).ok).toBe(true);
    expect((await submitFeedback(learner, courseId, { rating: 5, comment: "Great examples" })).ok).toBe(true);
    expect(await feedbackSummary(courseId)).toMatchObject({ count: 1, average: 5, comments: [expect.objectContaining({ comment: "Great examples" })] });
  });
});

describe("course Q&A", () => {
  it("lets learners ask and answer, and admins hide posts from learners", async () => {
    const q = await addPost(learner, courseId, { body: "What is a VLAN trunk?" });
    expect(q.ok).toBe(true);
    const qid = (q.ok && q.id) || "";
    expect((await addPost(other, courseId, { body: "It carries several VLANs.", parentId: qid })).ok).toBe(true);
    expect((await addPost(admin, courseId, { body: "Reply to a reply", parentId: (await prisma.coursePost.findFirstOrThrow({ where: { parentId: qid } })).id })).ok).toBe(false);
    expect((await threadsFor(learner, courseId))[0].replies).toHaveLength(1);

    expect((await setPostHidden(admin, qid, true)).ok).toBe(true);
    expect(await threadsFor(learner, courseId)).toHaveLength(0);
    expect(await threadsFor(admin, courseId)).toHaveLength(1);
    await expect(setPostHidden(learner, qid, false)).rejects.toThrow();
  });

  it("refuses posts on a draft course from learners", async () => {
    await expect(addPost(learner, draftId, { body: "hi" })).rejects.toThrow();
  });
});

describe("search", () => {
  it("finds published courses and lesson text for learners, and drafts and questions for admins", async () => {
    const forLearner = await search(learner, "zebra ROUTING");
    expect(forLearner.courses.map((c) => c.id)).toEqual([courseId]);
    expect((await search(learner, `${tag} loops`)).lessons.map((l) => l.id)).toEqual([lessonId]);
    expect((await search(learner, `${tag} Zebra`)).courses.map((c) => c.id)).toEqual([courseId]);
    expect((await search(admin, `${tag} Zebra`)).courses.map((c) => c.id).sort()).toEqual([courseId, draftId].sort());
    expect((await search(learner, "z")).courses).toEqual([]);
    // Wildcard characters are matched literally, not as patterns.
    expect((await search(learner, "%%%")).courses).toEqual([]);
  });
});
