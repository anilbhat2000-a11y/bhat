import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { openPeriodsFor } from "./open-periods";
import { setAssignments } from "./admin";
import { sendReminders } from "../notifications/send";

const tag = `unassign-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
let keep: string;
let drop: string;
let assessmentId: string;
let subjectId: string;

beforeAll(async () => {
  admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
  keep = (await prisma.user.create({ data: { name: "K", email: `${tag}-k@example.test`, passwordHash: "x", role: "EMPLOYEE" } })).id;
  drop = (await prisma.user.create({ data: { name: "D", email: `${tag}-d@example.test`, passwordHash: "x", role: "EMPLOYEE" } })).id;
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  assessmentId = (await prisma.assessment.create({
    data: { subjectId, title: tag, cadence: "MONTHLY", level: "BASIC", passMarkPercent: 70, published: true },
  })).id;
  await setAssignments(admin, assessmentId, [{ targetType: "ALL", targetValue: null }]);
  await openPeriodsFor(assessmentId, new Date());
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: { in: [keep, drop] } } });
  await prisma.assessmentPeriod.deleteMany({ where: { assessmentId } });
  await prisma.assessmentAssignment.deleteMany({ where: { assessmentId } });
  await prisma.assessment.deleteMany({ where: { id: assessmentId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

it("unassigning a learner closes their open period, and keeps everyone still assigned", async () => {
  await setAssignments(admin, assessmentId, [{ targetType: "USER", targetValue: keep }]);
  expect(await prisma.assessmentPeriod.count({ where: { assessmentId, userId: drop } })).toBe(0);
  expect(await prisma.assessmentPeriod.count({ where: { assessmentId, userId: keep } })).toBe(1);
});

it("reminders go only to active learners of published assessments", async () => {
  const inactive = await prisma.user.create({ data: { name: "I", email: `${tag}-i@example.test`, passwordHash: "x", role: "EMPLOYEE", active: false } });
  await prisma.assessmentPeriod.create({
    data: { assessmentId, userId: inactive.id, periodKey: "2030-01", opensAt: new Date("2029-12-01Z"), dueAt: new Date(Date.now() + 2 * 86400_000), status: "OPEN" },
  });
  const sent: string[] = [];
  await sendReminders(new Date(), { send: async (to) => { sent.push(to); } }, { skipDigest: true });
  expect(sent).not.toContain(`${tag}-i@example.test`);
});

it("an assignment to a department with no members, or an unknown user, is refused", async () => {
  const nobody = await setAssignments(admin, assessmentId, [{ targetType: "DEPARTMENT", targetValue: "No such dept" }]);
  expect(nobody.ok).toBe(false);
  const ghost = await setAssignments(admin, assessmentId, [{ targetType: "USER", targetValue: "not-a-user-id" }]);
  expect(ghost.ok).toBe(false);
});
