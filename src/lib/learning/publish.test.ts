import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { canPublishLesson } from "./publish";
import { setCoursePublished } from "./courses";

describe("a video lesson needs captions before publishing (spec 6B)", () => {
  it("refuses a video lesson without a caption file, with the reason", () => {
    expect(canPublishLesson({ type: "VIDEO", captionFileKey: null })).toEqual({
      ok: false,
      reason: "Captions (.vtt) are required for video lessons",
    });
  });

  it("accepts a video lesson that has captions", () => {
    expect(canPublishLesson({ type: "VIDEO", captionFileKey: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.vtt" })).toEqual({ ok: true });
  });

  it("text lessons need no captions", () => {
    expect(canPublishLesson({ type: "TEXT", captionFileKey: null })).toEqual({ ok: true });
  });
});

describe("publishing a course checks its video captions", () => {
  const tag = `caps-${Date.now()}`;
  const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
  let subjectId: string;
  let courseId: string;
  let videoId: string;

  beforeAll(async () => {
    const a = await prisma.user.create({ data: { name: "A", email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN" } });
    admin.id = a.id;
    const s = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } });
    subjectId = s.id;
    const c = await prisma.course.create({ data: { subjectId, title: `${tag} c`, level: "BASIC", passMarkPercent: 70 } });
    courseId = c.id;
    videoId = (await prisma.lesson.create({ data: { courseId, position: 1, title: "Video", type: "VIDEO", fileKey: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.mp4" } })).id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { courseId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("publishing is refused while a video has no caption file", async () => {
    const r = await setCoursePublished(admin, courseId, true);
    expect(r).toEqual({ ok: false, error: "Captions (.vtt) are required for video lessons" });
  });

  it("publishing is allowed once the caption file is attached", async () => {
    await prisma.lesson.update({ where: { id: videoId }, data: { captionFileKey: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d.vtt" } });
    expect((await setCoursePublished(admin, courseId, true)).ok).toBe(true);
    await setCoursePublished(admin, courseId, false);
  });
});
