import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./db/client";
import { purgeOldData, retentionDays } from "./retention";

// The purge is limited to this test's user, because other test files share the database.
const NOW = new Date("2040-06-01T00:00:00Z");
const OLD = new Date("2039-01-01T00:00:00Z"); // 17 months before NOW
const RECENT = new Date("2040-03-01T00:00:00Z"); // 3 months before NOW
const tag = `retention-${Date.now()}`;
let userId: string;
let subjectId: string;
let courseId: string;
const ids: Record<string, string> = {};

beforeAll(async () => {
  userId = (await prisma.user.create({ data: { name: "R", email: `${tag}@example.test`, passwordHash: "x", role: "EMPLOYEE" } })).id;
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "BUSINESS" } })).id;
  courseId = (await prisma.course.create({ data: { subjectId, title: `${tag} c`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } })).id;
  await prisma.courseProgress.create({ data: { userId, courseId, completedAt: OLD } });
  const assessmentId = (await prisma.assessment.create({ data: { subjectId, title: tag, cadence: "MONTHLY", level: "BASIC", passMarkPercent: 70 } })).id;
  for (const [key, due] of [["oldPeriod", OLD], ["newPeriod", RECENT]] as const) {
    ids[key] = (await prisma.assessmentPeriod.create({ data: { assessmentId, userId, periodKey: key, opensAt: due, dueAt: due } })).id;
  }
  ids.oldAttempt = (await prisma.assessmentAttempt.create({ data: { periodId: ids.oldPeriod, userId, presentedQuestions: [], status: "SUBMITTED" } })).id;
  const cert = (expiresAt: Date, code: string) => prisma.certification.create({ data: { userId, subjectId, level: "BASIC", issuedAt: OLD, expiresAt, verificationCode: `${code}${Date.now()}`.slice(0, 12) } });
  ids.oldCert = (await cert(new Date("2039-02-01Z"), "RTOLD")).id; // expired 16 months ago
  ids.recentCert = (await cert(new Date("2040-01-01Z"), "RTNEW")).id; // expired 5 months ago
  ids.oldAudit = (await prisma.auditEvent.create({ data: { actorId: userId, action: "x", entityType: tag, entityId: "1", at: OLD } })).id;
  ids.newAudit = (await prisma.auditEvent.create({ data: { actorId: userId, action: "x", entityType: tag, entityId: "2", at: RECENT } })).id;
  ids.oldPost = (await prisma.coursePost.create({ data: { courseId, userId, body: "old", createdAt: OLD } })).id;
  ids.oldReply = (await prisma.coursePost.create({ data: { courseId, userId, body: "reply", parentId: ids.oldPost, createdAt: RECENT } })).id;
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { entityType: tag } });
  await prisma.certification.deleteMany({ where: { userId } });
  await prisma.assessment.deleteMany({ where: { subjectId } });
  await prisma.course.deleteMany({ where: { subjectId } });
  await prisma.subject.delete({ where: { id: subjectId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

it("defaults to one year, and refuses periods shorter than 30 days", () => {
  expect(retentionDays({})).toBe(365);
  expect(retentionDays({ RETENTION_DAYS: "730" })).toBe(730);
  expect(retentionDays({ RETENTION_DAYS: "7" })).toBe(365);
});

it("deletes data older than a year and keeps recent data, completions and accounts", async () => {
  await purgeOldData(NOW, 365, [userId]);
  expect(await prisma.assessmentPeriod.findUnique({ where: { id: ids.oldPeriod } })).toBeNull();
  expect(await prisma.assessmentAttempt.findUnique({ where: { id: ids.oldAttempt } })).toBeNull();
  expect(await prisma.assessmentPeriod.findUnique({ where: { id: ids.newPeriod } })).not.toBeNull();
  expect(await prisma.certification.findUnique({ where: { id: ids.oldCert } })).toBeNull();
  expect(await prisma.certification.findUnique({ where: { id: ids.recentCert } })).not.toBeNull();
  expect(await prisma.auditEvent.findUnique({ where: { id: ids.oldAudit } })).toBeNull();
  expect(await prisma.auditEvent.findUnique({ where: { id: ids.newAudit } })).not.toBeNull();
  expect(await prisma.coursePost.findUnique({ where: { id: ids.oldReply } })).toBeNull(); // went with its question
  expect(await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId } } })).not.toBeNull();
  expect(await prisma.user.findUnique({ where: { id: userId } })).not.toBeNull();
});
