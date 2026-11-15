import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildTrainingReport, filterTrainingReport, trainingReport, parseTrainingFilters } from "./training";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";

const now = new Date("2026-11-15T06:00:00Z");
const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("building the report", () => {
  const users = [
    { id: "u1", name: "Asha", email: "asha@x", department: "Sales", jobTitle: "AM", manager: "Ravi" },
    { id: "u2", name: "Bala", email: "bala@x", department: "Tech", jobTitle: "Engineer", manager: null },
  ];
  const courses = new Map([
    ["c1", { title: "GST basics", subject: "Accounts", lessonIds: ["l1", "l2", "l3", "l4"] }],
    ["c2", { title: "CRM hygiene", subject: "Sales", lessonIds: ["m1", "m2"] }],
    ["c3", { title: "VLANs", subject: "Networking", lessonIds: ["n1"] }],
  ]);
  const refs = [
    { courseId: "c1", targetType: "DEPARTMENT" as const, targetValue: "Sales", dueAt: d("2026-12-31"), createdAt: d("2026-11-01"), via: "Department" },
    { courseId: "c1", targetType: "USER" as const, targetValue: "u1", dueAt: d("2026-12-01"), createdAt: d("2026-11-05"), via: "Directly" },
    { courseId: "c2", targetType: "USER" as const, targetValue: "u1", dueAt: d("2026-11-10"), createdAt: d("2026-10-01"), via: "Path: Sales starter" },
    { courseId: "c3", targetType: "JOB_TITLE" as const, targetValue: "AM", dueAt: null, createdAt: d("2026-09-01"), via: "Job title" },
    { courseId: "gone", targetType: "USER" as const, targetValue: "u1", dueAt: null, createdAt: d("2026-09-01"), via: "Directly" },
  ];
  const progress = new Map([
    ["u1|c1", { completedAt: null, completedLessonIds: ["l1", "l2", "old-lesson"] }],
    ["u1|c3", { completedAt: d("2026-10-02"), completedLessonIds: ["n1"] }],
  ]);
  const [asha, bala] = buildTrainingReport(users, refs, courses, progress, now);

  it("lists each assigned training once, with the earliest assignment and due date, and how it was assigned", () => {
    expect(asha.trainings.map((t) => t.course)).toEqual(["CRM hygiene", "GST basics", "VLANs"]);
    const gst = asha.trainings.find((t) => t.courseId === "c1")!;
    expect(gst).toMatchObject({ assignedAt: d("2026-11-01"), dueAt: d("2026-12-01"), assignedVia: "Department; Directly", lessonsDone: 2, lessonsTotal: 4, percent: 50, status: "In progress" });
    expect(asha.trainings.find((t) => t.courseId === "c2")).toMatchObject({ status: "Overdue", percent: 0 });
    expect(asha.trainings.find((t) => t.courseId === "c3")).toMatchObject({ status: "Completed", percent: 100, completedAt: d("2026-10-02") });
  });

  it("works out completion and progress percentages", () => {
    expect(asha).toMatchObject({ assigned: 3, completed: 1, inProgress: 1, overdue: 1, notStarted: 0, completionPercent: 33, progressPercent: 50 });
    expect(bala).toMatchObject({ assigned: 0, completionPercent: 0 });
  });

  it("filters by name, department, status and assignment period", () => {
    const rows = [asha, bala];
    expect(filterTrainingReport(rows, { q: "ASH" }).map((e) => e.name)).toEqual(["Asha"]);
    expect(filterTrainingReport(rows, { department: "Tech" }).map((e) => e.name)).toEqual(["Bala"]);
    expect(filterTrainingReport(rows, { status: "overdue" }).map((e) => e.name)).toEqual(["Asha"]);
    expect(filterTrainingReport(rows, { status: "none" }).map((e) => e.name)).toEqual(["Bala"]);
    const nov = filterTrainingReport(rows, { from: d("2026-10-15"), to: d("2026-11-30") })[0];
    expect(nov).toMatchObject({ assigned: 1, completed: 0 });
    expect(parseTrainingFilters({ status: "bogus", from: "2026-11-01", department: "" })).toMatchObject({ status: undefined, department: undefined });
  });
});

describe("reading the report from the database", () => {
  const tag = `tr-${Date.now()}`;
  let admin: SessionUser;
  let manager: SessionUser;
  beforeAll(async () => {
    const mk = async (name: string, role: "ADMIN" | "MANAGER" | "EMPLOYEE", managerId?: string) => {
      const u = await prisma.user.create({ data: { name: `${tag} ${name}`, email: `${tag}-${name}@example.test`, passwordHash: "x", role, department: `${tag} D`, managerId } });
      return { id: u.id, role, active: true, name: u.name, email: u.email, department: u.department } as SessionUser;
    };
    admin = await mk("admin", "ADMIN");
    manager = await mk("mgr", "MANAGER");
    const emp = await mk("emp", "EMPLOYEE", manager.id);
    await mk("other", "EMPLOYEE");
    const subject = await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "BUSINESS" } });
    const course = await prisma.course.create({ data: { subjectId: subject.id, title: `${tag} course`, level: "BASIC", passMarkPercent: 70, status: "PUBLISHED" } });
    const l = await prisma.lesson.create({ data: { courseId: course.id, position: 1, title: "L", type: "TEXT", body: "x" } });
    await prisma.lesson.create({ data: { courseId: course.id, position: 2, title: "L2", type: "TEXT", body: "x" } });
    await prisma.courseAssignment.create({ data: { courseId: course.id, targetType: "DEPARTMENT", targetValue: `${tag} D`, dueAt: new Date(Date.now() + 86400_000), assignedById: admin.id } });
    await prisma.courseProgress.create({ data: { userId: emp.id, courseId: course.id, completedLessonIds: [l.id] } });
  });
  afterAll(async () => {
    await prisma.course.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.subject.deleteMany({ where: { slug: tag } });
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("shows admins everyone and managers only their team", async () => {
    const mine = (rows: { email: string }[]) => rows.filter((r) => r.email.startsWith(tag)).map((r) => r.email.replace(`${tag}-`, "")).sort();
    const all = await trainingReport(admin);
    expect(mine(all)).toEqual(["admin@example.test", "emp@example.test", "mgr@example.test", "other@example.test"]);
    const team = await trainingReport(manager);
    expect(mine(team)).toEqual(["emp@example.test"]);
    expect(team.find((e) => e.email.startsWith(tag))!.trainings[0]).toMatchObject({ lessonsDone: 1, lessonsTotal: 2, percent: 50, status: "In progress", assignedVia: "Department" });
  });
});
