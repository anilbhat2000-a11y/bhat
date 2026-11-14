import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./db/client";
import type { SessionUser } from "./auth/session";
import { createSession } from "./auth/session";
import { hashPassword, verifyPassword } from "./auth/password";
import { completeLesson } from "./learning/progress";
import { changeOwnPassword, setUserPassword } from "./admin/users";
import { createCourse, deleteCourse, updateCourse } from "./learning/courses";
import { updateSubject } from "./admin/users";

const tag = `fixes-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
let learner: SessionUser;
let subjectId: string;
let liveCourseId: string;
let liveLessonId: string;

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
  const l = await prisma.user.create({ data: { name: "L", email: `${tag}-l@example.test`, passwordHash: await hashPassword("Old-pass-1"), role: "EMPLOYEE" } });
  learner = { id: l.id, role: "EMPLOYEE", active: true, name: "L", email: l.email, department: null };
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  liveCourseId = (await prisma.course.create({ data: { subjectId, title: `${tag} live`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } })).id;
  liveLessonId = (await prisma.lesson.create({ data: { courseId: liveCourseId, position: 1, title: "Live", type: "LIVE_SESSION" } })).id;
});

afterAll(async () => {
  await prisma.lessonProgress.deleteMany({ where: { lessonId: liveLessonId } });
  await prisma.courseProgress.deleteMany({ where: { courseId: liveCourseId } });
  await prisma.course.deleteMany({ where: { subjectId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.session.deleteMany({ where: { user: { email: { contains: tag } } } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("live sessions complete by attendance, not by the learner", () => {
  it("refuses a learner's own 'mark complete' on a live session lesson", async () => {
    const r = await completeLesson(learner, liveLessonId);
    expect(r.ok).toBe(false);
  });
});

describe("passwords", () => {
  it("a learner changes their own password only with the current one", async () => {
    expect((await changeOwnPassword(learner, "wrong-current", "New-pass-2")).ok).toBe(false);
    expect((await changeOwnPassword(learner, "Old-pass-1", "New-pass-2")).ok).toBe(true);
    const u = await prisma.user.findUnique({ where: { id: learner.id } });
    expect(await verifyPassword("New-pass-2", u!.passwordHash)).toBe(true);
  });

  it("an admin resets a user's password and that user's sessions end", async () => {
    await createSession(learner.id);
    expect((await setUserPassword(admin, learner.id, "Reset-pass-3")).ok).toBe(true);
    expect(await prisma.session.count({ where: { userId: learner.id } })).toBe(0);
    const u = await prisma.user.findUnique({ where: { id: learner.id } });
    expect(await verifyPassword("Reset-pass-3", u!.passwordHash)).toBe(true);
  });
});

describe("editing and deleting content", () => {
  it("an admin renames a subject and changes its validity", async () => {
    expect((await updateSubject(admin, subjectId, { name: `${tag} renamed`, certificationValidityMonths: 6 })).ok).toBe(true);
    const s = await prisma.subject.findUnique({ where: { id: subjectId } });
    expect(s?.name).toBe(`${tag} renamed`);
    expect(s?.certificationValidityMonths).toBe(6);
  });

  it("an admin edits a course's title", async () => {
    expect((await updateCourse(admin, liveCourseId, { title: `${tag} live edited` })).ok).toBe(true);
    expect((await prisma.course.findUnique({ where: { id: liveCourseId } }))?.title).toBe(`${tag} live edited`);
  });

  it("a published course cannot be deleted, a draft can", async () => {
    expect((await deleteCourse(admin, liveCourseId)).ok).toBe(false);
    const draft = await createCourse(admin, { subjectId, title: `${tag} draft`, description: "", level: "BASIC", passMarkPercent: 70 });
    if (!draft.ok || !draft.id) throw new Error("setup");
    expect((await deleteCourse(admin, draft.id)).ok).toBe(true);
    expect(await prisma.course.findUnique({ where: { id: draft.id } })).toBeNull();
  });
});

describe("catalogue modify and delete", () => {
  it("modifies subject and status, deletes an unused published course, and refuses one with learner records", async () => {
    const { deleteCourseSafely, setCourseStatus, courseImpact } = await import("./learning/courses");
    const made = await createCourse(admin, { subjectId, title: `${tag} catalogue`, description: "", level: "BASIC", passMarkPercent: 70 });
    if (!made.ok || !made.id) throw new Error("setup");
    const id = made.id;
    expect(await updateCourse(admin, id, { subjectId: "missing" })).toMatchObject({ ok: false });
    expect(await updateCourse(admin, id, { title: " " })).toMatchObject({ ok: false });
    // Publishing needs a lesson.
    expect(await setCourseStatus(admin, id, "PUBLISHED")).toMatchObject({ ok: false });
    await prisma.lesson.create({ data: { courseId: id, position: 1, title: "L1", type: "TEXT", body: "x" } });
    expect((await setCourseStatus(admin, id, "PUBLISHED")).ok).toBe(true);
    expect((await setCourseStatus(admin, id, "ARCHIVED")).ok).toBe(true);
    expect((await setCourseStatus(admin, id, "PUBLISHED")).ok).toBe(true);
    expect((await prisma.course.findUniqueOrThrow({ where: { id } })).status).toBe("PUBLISHED");
    // A learner starts it: it can no longer be deleted, only archived.
    await prisma.courseProgress.create({ data: { userId: admin.id, courseId: id } });
    expect((await courseImpact(id)).hasLearnerRecords).toBe(true);
    expect(await deleteCourseSafely(admin, id)).toMatchObject({ ok: false });
    await prisma.courseProgress.deleteMany({ where: { courseId: id } });
    expect((await deleteCourseSafely(admin, id)).ok).toBe(true);
    expect(await prisma.course.findUnique({ where: { id } })).toBeNull();
  });
});
