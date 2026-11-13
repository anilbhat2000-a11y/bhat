import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { parseLabChecklist, labComplete, saveLabProgress } from "./labs";

const BODY = [
  "Set up the lab network.",
  "- [ ] Create the VLAN",
  "- [ ] Configure the switch port",
  "- [ ] Test connectivity",
].join("\n");

describe("lab checklist", () => {
  it("parses each checkbox line into an item with a stable id", () => {
    expect(parseLabChecklist(BODY)).toEqual([
      { id: "item-1", text: "Create the VLAN" },
      { id: "item-2", text: "Configure the switch port" },
      { id: "item-3", text: "Test connectivity" },
    ]);
  });

  it("is complete only when every item is checked; unknown ids do not count", () => {
    const items = parseLabChecklist(BODY);
    expect(labComplete(items, ["item-1", "item-2"])).toBe(false);
    expect(labComplete(items, ["item-1", "item-2", "item-3"])).toBe(true);
    expect(labComplete(items, ["item-1", "item-2", "item-9"])).toBe(false);
  });

  it("a lab with no checklist items is never complete", () => {
    expect(labComplete([], [])).toBe(false);
  });
});

describe("saving lab progress", () => {
  const tag = `labs-${Date.now()}`;
  const learner: SessionUser = { id: "", role: "EMPLOYEE", active: true, name: "L", email: "", department: null };
  let courseId: string;
  let subjectId: string;
  let labId: string;

  beforeAll(async () => {
    const u = await prisma.user.create({ data: { name: "L", email: `${tag}@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
    learner.id = u.id;
    const s = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } });
    subjectId = s.id;
    const c = await prisma.course.create({ data: { subjectId, title: `${tag} c`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } });
    courseId = c.id;
    labId = (await prisma.lesson.create({ data: { courseId, position: 1, title: "Lab", type: "LAB", body: BODY } })).id;
  });

  afterAll(async () => {
    await prisma.lessonProgress.deleteMany({ where: { lessonId: labId } });
    await prisma.courseProgress.deleteMany({ where: { courseId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("saves partial checks without completing the lesson", async () => {
    const r = await saveLabProgress(labId, learner.id, ["item-1"]);
    expect(r.complete).toBe(false);
    const lp = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: learner.id, lessonId: labId } } });
    expect(lp?.checkedItemIds).toEqual(["item-1"]);
  });

  it("completes the lesson when the last item is checked", async () => {
    const r = await saveLabProgress(labId, learner.id, ["item-1", "item-2", "item-3"]);
    expect(r.complete).toBe(true);
    const cp = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: learner.id, courseId } } });
    expect(cp?.completedLessonIds).toContain(labId);
  });
});
