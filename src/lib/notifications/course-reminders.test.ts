import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import { sendReminders } from "./send";
import { completeLessonForUser } from "../learning/progress";

const tag = `course-rem-${Date.now()}`;
let subjectId: string;
let courseId: string;
let lessonId: string;
let learnerEmail: string;
let learnerId: string;

beforeAll(async () => {
  const admin = await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } });
  const learner = await prisma.user.create({ data: { name: "L", email: `${tag}-l@example.test`, passwordHash: "x", role: "EMPLOYEE", department: `${tag}-dept` } });
  learnerEmail = learner.email;
  learnerId = learner.id;
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "BUSINESS" } })).id;
  const course = await prisma.course.create({
    data: { subjectId, title: `${tag} course`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED", lessons: { create: { position: 1, title: "L", type: "TEXT", body: "x" } } },
    include: { lessons: true },
  });
  courseId = course.id;
  lessonId = course.lessons[0].id;
  await prisma.courseAssignment.create({ data: { courseId, targetType: "DEPARTMENT", targetValue: `${tag}-dept`, dueAt: new Date("2031-03-10T12:00:00Z"), assignedById: admin.id } });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: learnerId } });
  await prisma.course.deleteMany({ where: { subjectId } });
  await prisma.subject.delete({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

const run = async (at: string) => {
  const subjects: string[] = [];
  await sendReminders(new Date(at), { send: async (to, subject) => { if (to === learnerEmail) subjects.push(subject); } }, { skipDigest: true });
  return subjects;
};

it("reminds a department member about an assigned course before it is due, once", async () => {
  expect(await run("2031-03-08T09:00:00Z")).toEqual([`Course due in a few days: ${tag} course`]);
  expect(await run("2031-03-08T10:00:00Z")).toEqual([]);
});

it("sends nothing once the course is finished", async () => {
  await completeLessonForUser(learnerId, lessonId);
  expect(await run("2031-03-11T09:00:00Z")).toEqual([]);
});
