import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import {
  applyFilters, assessmentView, certificationView, completionTrend, completionView, departmentView, expiryForecast,
  heatMap, loadRows, parseFilters, peopleView, recommendations, subjectProgress, weakTopics, windowStart, type Rows,
} from "./analytics";

const NOW = new Date("2026-11-13T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 3600_000);

const rows: Rows = {
  users: [
    { id: "u1", name: "Asha", department: "Sales", location: "Mumbai" },
    { id: "u2", name: "Ravi", department: "Sales", location: "Pune" },
    { id: "u3", name: "Meera", department: "Technical Services", location: "Mumbai" },
  ],
  courses: [
    { id: "c1", title: "Sales Basic", subject: "Sales", level: "BASIC", lessonCount: 4 },
    { id: "c2", title: "Sales Intermediate", subject: "Sales", level: "INTERMEDIATE", lessonCount: 2 },
    { id: "c3", title: "Networking Basic", subject: "NETWORKING", level: "BASIC", lessonCount: 5 },
  ],
  progress: [
    { userId: "u1", courseId: "c1", completedCount: 4, completedAt: days(-3) },
    { userId: "u2", courseId: "c1", completedCount: 1, completedAt: null },
    { userId: "u3", courseId: "c3", completedCount: 5, completedAt: days(-40) },
  ],
  attempts: [
    { userId: "u1", periodId: "p1", subject: "Sales", level: "BASIC", cadence: "MONTHLY", assessment: "M", submittedAt: days(-2), scorePercent: 90, passed: true, passMarkPercent: 70 },
    { userId: "u1", periodId: "p4", subject: "Sales", level: "BASIC", cadence: "WEEKLY", assessment: "W", submittedAt: days(-1), scorePercent: 80, passed: true, passMarkPercent: 70 },
    { userId: "u2", periodId: "p2", subject: "Sales", level: "BASIC", cadence: "MONTHLY", assessment: "M", submittedAt: days(-5), scorePercent: 40, passed: false, passMarkPercent: 70 },
    { userId: "u2", periodId: "p2", subject: "Sales", level: "BASIC", cadence: "MONTHLY", assessment: "M", submittedAt: days(-4), scorePercent: 50, passed: false, passMarkPercent: 70 },
    { userId: "u3", periodId: "p3", subject: "NETWORKING", level: "BASIC", cadence: "MONTHLY", assessment: "N", submittedAt: days(-60), scorePercent: 75, passed: true, passMarkPercent: 70 },
  ],
  periods: [
    { id: "p1", userId: "u1", subject: "Sales", level: "BASIC", status: "PASSED", attemptCount: 1, dueAt: days(10) },
    { id: "p2", userId: "u2", subject: "Sales", level: "BASIC", status: "OVERDUE", attemptCount: 2, dueAt: days(-1) },
    { id: "p5", userId: "u3", subject: "Sales", level: "BASIC", status: "OPEN", attemptCount: 0, dueAt: days(5) },
  ],
  certs: [
    { userId: "u1", subject: "Sales", level: "BASIC", issuedAt: days(-200), expiresAt: days(20) },
    { userId: "u1", subject: "Sales", level: "BASIC", issuedAt: days(-2), expiresAt: days(363) },
    { userId: "u3", subject: "NETWORKING", level: "BASIC", issuedAt: days(-60), expiresAt: days(45) },
    { userId: "u2", subject: "Sales", level: "INTERMEDIATE", issuedAt: days(-400), expiresAt: days(-35) },
  ],
  assigned: [
    { userId: "u1", courseId: "c1", dueAt: days(-1) }, // completed, so not counted
    { userId: "u2", courseId: "c1", dueAt: days(-1) }, // overdue
    { userId: "u3", courseId: "c1", dueAt: days(10) }, // not started
  ],
};

describe("dashboard views", () => {
  it("parses filters, ignoring unknown values", () => {
    expect(parseFilters({ level: "BASIC", department: " Sales ", period: "month" })).toEqual({ level: "BASIC", department: "Sales", location: undefined, period: "month" });
    expect(parseFilters({ level: "nope", period: "decade" })).toMatchObject({ level: undefined, period: "all" });
    expect(windowStart("week", NOW)?.toISOString()).toBe("2026-11-06T12:00:00.000Z");
    expect(windowStart("all", NOW)).toBeNull();
  });

  it("filters by department, location and level", () => {
    const sales = applyFilters(rows, { department: "Sales", period: "all" });
    expect(sales.users.map((u) => u.id)).toEqual(["u1", "u2"]);
    expect(sales.certs.every((c) => c.userId !== "u3")).toBe(true);
    const mumbaiBasic = applyFilters(rows, { location: "Mumbai", level: "BASIC", period: "all" });
    expect(mumbaiBasic.users.map((u) => u.id)).toEqual(["u1", "u3"]);
    expect(mumbaiBasic.courses.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("counts the latest certificate per person, subject and level, within the period", () => {
    const all = certificationView(rows, "all", NOW);
    expect(all.find((s) => s.subject === "Sales")).toMatchObject({ byLevel: { BASIC: 1, INTERMEDIATE: 1, ADVANCED: 0 }, active: 1, expired: 1 });
    const month = certificationView(rows, "month", NOW);
    expect(month.map((s) => s.subject)).toEqual(["Sales"]);
    expect(month[0].byLevel.BASIC).toBe(1);
  });

  it("reports completion per course and subject, and a monthly trend", () => {
    const all = completionView(rows, "all", NOW);
    expect(all.byCourse.find((c) => c.course === "Sales Basic")).toMatchObject({ started: 2, completed: 1, rate: 50 });
    expect(all.bySubject.find((s) => s.subject === "NETWORKING")).toMatchObject({ started: 1, completed: 1, rate: 100 });
    expect(completionView(rows, "month", NOW).bySubject.find((s) => s.subject === "NETWORKING")?.completed).toBe(0);
    expect(completionTrend(rows, NOW, 3)).toEqual([
      { month: "2026-09", completions: 0 }, { month: "2026-10", completions: 1 }, { month: "2026-11", completions: 1 },
    ]);
  });

  it("gives pass rate, average score and attempt distribution by subject and cadence", () => {
    const view = assessmentView(rows, "month", NOW);
    expect(view.find((v) => v.subject === "Sales" && v.cadence === "MONTHLY")).toEqual({
      subject: "Sales", cadence: "MONTHLY", attempts: 3, passRate: 33.3, averageScore: 60,
      periodsWithOneAttempt: 1, periodsWithTwoAttempts: 1, periodsWithThreeOrMore: 0,
    });
    expect(view.some((v) => v.subject === "NETWORKING")).toBe(false);
  });

  it("counts overdue and not-started assessments and assigned courses by department", () => {
    expect(departmentView(rows, NOW)).toEqual([
      { department: "Sales", overdue: 1, notStarted: 0, people: 2, coursesOverdue: 1, coursesNotStarted: 0 },
      { department: "Technical Services", overdue: 0, notStarted: 1, people: 1, coursesOverdue: 0, coursesNotStarted: 1 },
    ]);
  });

  it("lists top performers and people who need support", () => {
    const { top, support } = peopleView(rows, "all", NOW);
    expect(top.map((p) => p.name)).toEqual(["Asha", "Ravi"]);
    expect(support.map((p) => p.name)).toEqual(["Ravi"]);
  });

  it("forecasts active certificates expiring in 30, 60 and 90 days", () => {
    expect(expiryForecast(rows, NOW)).toEqual([{ subject: "NETWORKING", in30: 0, in60: 1, in90: 0 }]);
  });

  it("builds a team heat map", () => {
    const map = heatMap(rows, ["Sales", "NETWORKING"], NOW);
    expect(map.find((r) => r.userId === "u1")?.cells).toEqual({ Sales: "Certified", NETWORKING: "Not started" });
    expect(map.find((r) => r.userId === "u2")?.cells.Sales).toBe("Weak");
    expect(map.find((r) => r.userId === "u3")?.cells).toEqual({ Sales: "Not started", NETWORKING: "Certified" });
  });

  it("finds weak topics, progress per subject and level, and recommends the next course", () => {
    const weak = weakTopics(rows.attempts.filter((a) => a.userId === "u2"));
    expect(weak).toEqual([expect.objectContaining({ subject: "Sales", averageScore: 45 })]);
    expect(weakTopics(rows.attempts.filter((a) => a.userId === "u1"))).toEqual([]);
    const mine = rows.progress.filter((p) => p.userId === "u2");
    expect(subjectProgress(rows.courses, mine)).toEqual([{ subject: "Sales", level: "BASIC", lessons: 4, completed: 1, percent: 25 }]);
    expect(recommendations(weak, rows.courses, mine)).toEqual([{ subject: "Sales", courseId: "c1", course: "Sales Basic", level: "BASIC" }]);
  });
});

// Acceptance criterion: the admin dashboard's subject-wise certification counts match the
// database.
describe("dashboard counts against the database", () => {
  const tag = `analytics-${Date.now()}`;
  let admin: SessionUser;
  let subjectId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const a = await prisma.user.create({ data: { name: "A", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } });
    admin = { id: a.id, role: "ADMIN", active: true, name: "A", email: a.email, department: null };
    subjectId = (await prisma.subject.create({ data: { name: `${tag} subject`, slug: tag, category: "TECHNICAL" } })).id;
    const levels = ["BASIC", "BASIC", "INTERMEDIATE", "ADVANCED"] as const;
    for (const [i, level] of levels.entries()) {
      const u = await prisma.user.create({ data: { name: `L${i}`, email: `${tag}-${i}@example.test`, passwordHash: "x", role: "EMPLOYEE", department: `${tag}-dept` } });
      userIds.push(u.id);
      await prisma.certification.create({ data: { userId: u.id, subjectId, level, issuedAt: days(-10), expiresAt: i === 3 ? days(-1) : days(300), verificationCode: `${tag}${i}`.slice(-12).padStart(12, "Q") } });
    }
    // A renewal of the same person, subject and level counts once.
    await prisma.certification.create({ data: { userId: userIds[0], subjectId, level: "BASIC", issuedAt: days(-400), expiresAt: days(-35), verificationCode: `${tag}R`.slice(-12).padStart(12, "R") } });
  });

  afterAll(async () => {
    await prisma.certification.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("matches distinct (person, level) certificates counted directly in SQL", async () => {
    const view = certificationView(applyFilters(await loadRows(admin), { department: `${tag}-dept`, period: "all" }), "all", NOW);
    const row = view.find((s) => s.subject === `${tag} subject`);
    const direct = await prisma.$queryRaw<{ level: string; n: bigint }[]>`
      select level::text, count(distinct user_id) as n from certifications where subject_id = ${subjectId} group by level`;
    const byLevel = Object.fromEntries(direct.map((d) => [d.level, Number(d.n)]));
    expect(row?.byLevel).toEqual({ BASIC: byLevel.BASIC ?? 0, INTERMEDIATE: byLevel.INTERMEDIATE ?? 0, ADVANCED: byLevel.ADVANCED ?? 0 });
    expect(row).toMatchObject({ byLevel: { BASIC: 2, INTERMEDIATE: 1, ADVANCED: 1 }, active: 3, expired: 1 });
  });
});
