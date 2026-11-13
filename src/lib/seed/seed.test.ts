import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../db/client";
import { DEMO, DEPARTMENTS, runSeed, SUBJECTS } from "./run";

const CONTENT = "content/courses";

describe("seed", () => {
  it("refuses to run without a demo password of at least 8 characters", async () => {
    await expect(runSeed(prisma, { seedPassword: "short", contentDir: CONTENT })).rejects.toThrow(/SEED_PASSWORD/);
  });

  it("creates the subjects, demo users, and all course files; a second run changes nothing", async () => {
    await runSeed(prisma, { seedPassword: "Demo-pass-1", contentDir: CONTENT });
    const slugs = SUBJECTS.map((s) => s.slug);
    expect(await prisma.subject.count({ where: { slug: { in: slugs } } })).toBe(SUBJECTS.length);
    expect(SUBJECTS.filter((s) => s.category === "BUSINESS").length).toBe(9);
    expect(SUBJECTS.filter((s) => s.category === "TECHNICAL").length).toBe(10);
    // Brief section 11: 3 departments, 1 admin, 2 managers, 3 employees.
    const demo = await prisma.user.findMany({ where: { email: { in: DEMO.map((u) => u.email) } }, include: { manager: true } });
    expect(demo).toHaveLength(6);
    expect(demo.filter((u) => u.role === "ADMIN")).toHaveLength(1);
    expect(demo.filter((u) => u.role === "MANAGER")).toHaveLength(2);
    expect(demo.filter((u) => u.role === "EMPLOYEE")).toHaveLength(3);
    expect(new Set(demo.map((u) => u.department))).toEqual(new Set(DEPARTMENTS));
    const byEmail = new Map(demo.map((u) => [u.email, u]));
    expect(byEmail.get("employee@3c.example")?.manager?.email).toBe("manager@3c.example");
    expect(byEmail.get("employee3@3c.example")?.manager?.email).toBe("manager2@3c.example");

    // Two subjects fully built out, each with a 20-question bank labelled as placeholder.
    for (const [subject, dept] of [["Sales", "Sales"], ["NETWORKING", "Technical Services"]] as const) {
      const bank = await prisma.assessment.findFirst({
        where: { subject: { name: subject }, cadence: "MONTHLY", title: { startsWith: "[PLACEHOLDER]" } },
        include: { questions: true, assignments: true },
      });
      expect(bank?.questions).toHaveLength(20);
      expect(bank?.assignments).toEqual([expect.objectContaining({ targetType: "DEPARTMENT", targetValue: dept })]);
    }

    // Count only the seeded subjects: other test files create courses in parallel.
    const seededCourses = () => prisma.course.count({ where: { subject: { slug: { in: slugs } } } });
    const before = await seededCourses();
    await runSeed(prisma, { seedPassword: "Demo-pass-1", contentDir: CONTENT });
    expect(await seededCourses()).toBe(before);
    expect(await prisma.course.count({ where: { status: "PUBLISHED" } })).toBeGreaterThanOrEqual(28);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
