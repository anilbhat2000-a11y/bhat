import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { remindersDue, overdueByManager } from "./reminders";
import { prisma } from "../db/client";
import { sendReminders } from "./send";

const now = new Date("2026-11-13T00:00:00Z");
const day = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(now.getTime() + days * day);

describe("which reminders are due", () => {
  it("a period due in 2 days gets a DUE_SOON reminder", () => {
    const r = remindersDue([{ id: "p1", userId: "u1", dueAt: at(2), status: "OPEN" }], now, new Set());
    expect(r).toEqual([{ key: "p1:DUE_SOON", periodId: "p1", userId: "u1", type: "DUE_SOON" }]);
  });

  it("a period due in 5 days gets nothing yet", () => {
    expect(remindersDue([{ id: "p1", userId: "u1", dueAt: at(5), status: "OPEN" }], now, new Set())).toEqual([]);
  });

  it("a period due within 24 hours gets DUE_TODAY", () => {
    const r = remindersDue([{ id: "p1", userId: "u1", dueAt: new Date(now.getTime() + 6 * 3600_000), status: "OPEN" }], now, new Set());
    expect(r.map((x) => x.type)).toEqual(["DUE_TODAY"]);
  });

  it("an open period past its due time gets OVERDUE", () => {
    const r = remindersDue([{ id: "p1", userId: "u1", dueAt: at(-1), status: "OPEN" }], now, new Set());
    expect(r.map((x) => x.type)).toEqual(["OVERDUE"]);
  });

  it("a passed period never gets a reminder", () => {
    expect(remindersDue([{ id: "p1", userId: "u1", dueAt: at(-1), status: "PASSED" }], now, new Set())).toEqual([]);
  });

  it("a reminder already sent is not sent again", () => {
    const r = remindersDue([{ id: "p1", userId: "u1", dueAt: at(2), status: "OPEN" }], now, new Set(["p1:DUE_SOON"]));
    expect(r).toEqual([]);
  });
});

describe("manager digest", () => {
  it("groups overdue periods under each manager, for team members only", () => {
    const users = [
      { id: "m", managerId: null },
      { id: "e1", managerId: "m" },
      { id: "e2", managerId: "m" },
      { id: "x", managerId: null },
    ];
    const digest = overdueByManager(
      [
        { userId: "e1", status: "OVERDUE", title: "Quiz A" },
        { userId: "x", status: "OVERDUE", title: "Quiz B" },
        { userId: "e2", status: "OPEN", title: "Quiz C" },
      ],
      users,
    );
    expect(digest).toEqual(new Map([["m", [{ userId: "e1", title: "Quiz A" }]]]));
  });
});

describe("sending reminders once", () => {
  const tag = `remind-${Date.now()}`;
  let userId: string;
  let assessmentId: string;
  let subjectId: string;
  let periodId: string;

  beforeAll(async () => {
    const u = await prisma.user.create({ data: { name: "R", email: `${tag}@example.test`, passwordHash: "x", role: "EMPLOYEE" } });
    userId = u.id;
    const s = await prisma.subject.create({ data: { name: `${tag} s`, slug: `${tag}-s`, category: "TECHNICAL" } });
    subjectId = s.id;
    const a = await prisma.assessment.create({ data: { subjectId, title: `${tag} quiz`, cadence: "ONE_TIME", level: "BASIC", passMarkPercent: 70, published: true } });
    assessmentId = a.id;
    const p = await prisma.assessmentPeriod.create({
      data: { assessmentId, userId, periodKey: "ONCE", opensAt: new Date("2026-11-01Z"), dueAt: new Date(Date.now() + 2 * day), status: "OPEN" },
    });
    periodId = p.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.assessmentPeriod.deleteMany({ where: { assessmentId } });
    await prisma.assessment.deleteMany({ where: { id: assessmentId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("emails once, records the notification, and sends nothing on the next run", async () => {
    const sent: string[] = [];
    const mailer = { send: async (to: string) => { sent.push(to); } };
    const now1 = new Date();
    await sendReminders(now1, mailer, { skipDigest: true });
    const again = await sendReminders(now1, mailer, { skipDigest: true });
    expect(sent.filter((to) => to === `${tag}@example.test`)).toHaveLength(1);
    expect(again.sent).toBe(0);
    expect(await prisma.notification.count({ where: { userId, key: `${periodId}:DUE_SOON` } })).toBe(1);
  });
});
