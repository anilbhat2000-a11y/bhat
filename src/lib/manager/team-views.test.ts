import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { memberDetail, teamCompletion } from "./team";

const tag = `team-view-${Date.now()}`;
let manager: SessionUser;
let member: string;
let subjectId: string;
let courseA: string;
let courseB: string;

beforeAll(async () => {
  const m = await prisma.user.create({ data: { name: "Mgr", email: `${tag}-m@example.test`, passwordHash: "x", role: "MANAGER" } });
  manager = { id: m.id, role: "MANAGER", active: true, name: "Mgr", email: m.email, department: null };
  member = (await prisma.user.create({ data: { name: "Mem", email: `${tag}-e@example.test`, passwordHash: "x", role: "EMPLOYEE", managerId: m.id } })).id;
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  await prisma.profileSkill.create({ data: { userId: member, subjectId, selfRating: 4 } });
  await prisma.profileLanguage.create({ data: { userId: member, language: "Hindi", level: "FLUENT" } });
  courseA = (await prisma.course.create({ data: { subjectId, title: `${tag} A`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } })).id;
  courseB = (await prisma.course.create({ data: { subjectId, title: `${tag} B`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } })).id;
  const lesson = await prisma.lesson.create({ data: { courseId: courseA, position: 1, title: "L", type: "TEXT", body: "x" } });
  await prisma.courseProgress.create({ data: { userId: member, courseId: courseA, completedLessonIds: [lesson.id], completedAt: new Date() } });
});

afterAll(async () => {
  await prisma.courseProgress.deleteMany({ where: { userId: member } });
  await prisma.lesson.deleteMany({ where: { courseId: { in: [courseA, courseB] } } });
  await prisma.course.deleteMany({ where: { id: { in: [courseA, courseB] } } });
  await prisma.profileSkill.deleteMany({ where: { userId: member } });
  await prisma.profileLanguage.deleteMany({ where: { userId: member } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

describe("manager views of a team member", () => {
  it("the member's profile (skills, languages) is visible to their manager", async () => {
    const d = await memberDetail(manager, member);
    expect(d.profile.skills).toEqual([{ subject: `${tag} s`, rating: 4 }]);
    expect(d.profile.languages).toEqual([{ language: "Hindi", level: "FLUENT" }]);
  });

  it("the team completion rate is completed courses over published courses", async () => {
    const rows = await teamCompletion(manager);
    const row = rows.find((r) => r.id === member);
    expect(row?.completed).toBe(1);
    expect(row?.published).toBeGreaterThanOrEqual(2);
    expect(row?.percent).toBe(Math.round((1 / row!.published) * 100));
  });
});
