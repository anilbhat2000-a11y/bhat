import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../db/client";
import { createLocalStorage } from "../storage/local";
import type { SessionUser } from "../auth/session";
import {
  createCourse, setCoursePublished, addLesson, uploadLessonFile, reorderLessons, getLessonFile,
} from "./courses";

const tag = `courses-${Date.now()}`;
let root: string;
let storage: ReturnType<typeof createLocalStorage>;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
const employee: SessionUser = { id: "", role: "EMPLOYEE", active: true, name: "E", email: "", department: null };
let subjectId: string;
let courseId: string;
const pdf = Buffer.from("%PDF-1.4 test");

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "lms-courses-"));
  storage = createLocalStorage(root);
  const a = await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } });
  admin.id = a.id;
  const e = await prisma.user.create({ data: { name: "E", email: `${tag}-e@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
  employee.id = e.id;
  const s = await prisma.subject.create({ data: { name: `${tag} subject`, slug: `${tag}-subject`, category: "TECHNICAL" } });
  subjectId = s.id;
  const c = await createCourse(admin, { subjectId, title: "Course", description: "d", level: "BASIC", passMarkPercent: 70 });
  if (!c.ok || !c.id) throw new Error("setup failed");
  courseId = c.id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { subjectId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
  rmSync(root, { recursive: true, force: true });
});

describe("courses and lessons", () => {
  it("refuses to publish a course with no lessons", async () => {
    const r = await setCoursePublished(admin, courseId, true);
    expect(r).toEqual({ ok: false, error: "Add at least one lesson before publishing" });
  });

  it("publishes once a lesson exists", async () => {
    expect((await addLesson(admin, courseId, { title: "Intro", type: "TEXT", body: "Hello" })).ok).toBe(true);
    expect((await setCoursePublished(admin, courseId, true)).ok).toBe(true);
    await setCoursePublished(admin, courseId, false);
  });

  it("refuses an HTML file as a PDF lesson, and leaves no lesson row and no stored file", async () => {
    const lessonsBefore = await prisma.lesson.count({ where: { courseId } });
    const filesBefore = readdirSync(root).length;
    const r = await uploadLessonFile(
      admin, courseId,
      { title: "Bad", type: "PDF", filename: "x.html", mime: "text/html", sizeBytes: 10, bytes: Buffer.from("<html>") },
      storage,
    );
    expect(r.ok).toBe(false);
    expect(await prisma.lesson.count({ where: { courseId } })).toBe(lessonsBefore);
    expect(readdirSync(root).length).toBe(filesBefore);
  });

  it("stores an uploaded PDF and creates its lesson at the next position", async () => {
    const r = await uploadLessonFile(
      admin, courseId,
      { title: "Guide", type: "PDF", filename: "guide.pdf", mime: "application/pdf", sizeBytes: pdf.length, bytes: pdf },
      storage,
    );
    expect(r.ok).toBe(true);
  });

  it("an employee cannot read a file from an unpublished course (Review Focus 3 / access)", async () => {
    const lesson = await prisma.lesson.findFirst({ where: { courseId, type: "PDF" } });
    expect(lesson).not.toBeNull();
    expect(await getLessonFile(employee, lesson!.id)).toBeNull();
    const asAdmin = await getLessonFile(admin, lesson!.id);
    expect(asAdmin?.mime).toBe("application/pdf");
  });

  it("reorder refuses an id list that does not match the course's lessons", async () => {
    const r = await reorderLessons(admin, courseId, ["not-a-lesson"]);
    expect(r.ok).toBe(false);
  });

  it("reorder swaps positions", async () => {
    const lessons = await prisma.lesson.findMany({ where: { courseId }, orderBy: { position: "asc" } });
    const reversed = [...lessons].reverse().map((l) => l.id);
    expect((await reorderLessons(admin, courseId, reversed)).ok).toBe(true);
    const after = await prisma.lesson.findMany({ where: { courseId }, orderBy: { position: "asc" } });
    expect(after.map((l) => l.id)).toEqual(reversed);
  });
});
