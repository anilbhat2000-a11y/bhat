import { it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import { sendReminders } from "./send";

const tag = `digest-${Date.now()}`;
let managerId: string;
let memberId: string;
let assessmentId: string;
let subjectId: string;

beforeAll(async () => {
  managerId = (await prisma.user.create({ data: { name: "Manager M", email: `${tag}-m@example.test`, passwordHash: "x", role: "MANAGER" } })).id;
  memberId = (await prisma.user.create({ data: { name: "Member Zed", email: `${tag}-z@example.test`, passwordHash: "x", role: "EMPLOYEE", managerId } })).id;
  subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } })).id;
  assessmentId = (await prisma.assessment.create({ data: { subjectId, title: `${tag} quiz`, cadence: "MONTHLY", level: "BASIC", passMarkPercent: 70, published: true } })).id;
  await prisma.assessmentPeriod.create({
    data: { assessmentId, userId: memberId, periodKey: "2029-12", opensAt: new Date("2029-12-01Z"), dueAt: new Date("2029-12-31Z"), status: "OVERDUE" },
  });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: managerId } });
  await prisma.assessmentPeriod.deleteMany({ where: { assessmentId } });
  await prisma.assessment.deleteMany({ where: { id: assessmentId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.$disconnect();
});

it("the Monday digest names the overdue member and the assessment", async () => {
  const bodies: string[] = [];
  await sendReminders(new Date("2030-01-07T09:00:00Z"), { send: async (to, _s, body) => { if (to === `${tag}-m@example.test`) bodies.push(body); } });
  expect(bodies.join("\n")).toContain("Member Zed");
  expect(bodies.join("\n")).toContain(`${tag} quiz`);
});

it("a digest that is more than four weeks past due is not listed", async () => {
  const bodies: string[] = [];
  await sendReminders(new Date("2031-06-02T09:00:00Z"), { send: async (to, _s, body) => { if (to === `${tag}-m@example.test`) bodies.push(body); } });
  expect(bodies.join("\n")).not.toContain("Member Zed");
});
