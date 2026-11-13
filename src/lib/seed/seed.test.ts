import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../db/client";
import { runSeed, SUBJECTS } from "./run";

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
    expect(await prisma.user.count({ where: { email: { in: ["admin@3c.example", "manager@3c.example", "employee@3c.example"] } } })).toBe(3);

    const courses = await prisma.course.count();
    await runSeed(prisma, { seedPassword: "Demo-pass-1", contentDir: CONTENT });
    expect(await prisma.course.count()).toBe(courses);
    expect(await prisma.course.count({ where: { status: "PUBLISHED" } })).toBeGreaterThanOrEqual(28);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
