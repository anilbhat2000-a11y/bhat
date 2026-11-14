import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../db/client";
import { runSeed } from "./run";

const TITLE = `Sync test course ${Date.now()}`;

function course(lessonBodies: string[], questions: string[]) {
  return {
    slug: "sync-test",
    title: TITLE,
    subject: "Sales",
    category: "BUSINESS",
    level: "BASIC",
    passMarkPercent: 70,
    description: `Lessons: ${lessonBodies.length}`,
    modules: lessonBodies.map((_, i) => ({ title: `Module ${i + 1}`, minutes: 10 })),
    lessons: lessonBodies.map((body, i) => ({ position: i + 1, title: `Lesson ${i + 1}`, type: "TEXT", body, module: i + 1 })),
    sources: [{ title: "Example", url: "https://example.com/" }],
    assessment: {
      title: "Sync test: completion check",
      level: "BASIC",
      passMarkPercent: 70,
      questions: questions.map((text) => ({ type: "TRUE_FALSE", text, options: ["True", "False"], correct: ["True"], points: 1, explanation: "Because." })),
    },
  };
}

describe("seed content sync", () => {
  const dir = mkdtempSync(join(tmpdir(), "lms-sync-"));
  const contentDir = join(dir, "courses");
  const bankDir = join(dir, "banks");
  mkdirSync(contentDir);
  mkdirSync(bankDir);
  const write = (c: unknown) => writeFileSync(join(contentDir, "c.json"), JSON.stringify(c));
  const seed = () => runSeed(prisma, { seedPassword: "Demo-pass-1", contentDir, bankDir });
  const load = () =>
    prisma.course.findFirstOrThrow({
      where: { title: TITLE },
      include: { lessons: { orderBy: { position: "asc" } }, modules: { orderBy: { position: "asc" } }, assessments: { include: { questions: { orderBy: { position: "asc" } } } } },
    });

  it("updates a seed-managed course in place, keeping lesson records, and leaves customised courses alone", async () => {
    write(course(["one", "two", "three"], ["Q1", "Q2"]));
    expect((await seed()).updated).toBe(0);
    const v1 = await load();
    expect(v1.contentSource).toBe("seed");
    expect(v1.sources).toEqual([{ title: "Example", url: "https://example.com/" }]);

    // Unchanged file: nothing to do.
    expect((await seed()).updated).toBe(0);

    write(course(["one, rewritten", "two, rewritten"], ["Q1 new", "Q2 new", "Q3 new"]));
    expect((await seed()).updated).toBe(1);
    const v2 = await load();
    expect(v2.lessons.map((l) => l.body)).toEqual(["one, rewritten", "two, rewritten"]);
    expect(v2.lessons.map((l) => l.id)).toEqual(v1.lessons.slice(0, 2).map((l) => l.id));
    expect(v2.lessons.map((l) => l.moduleId)).toEqual(v2.modules.map((m) => m.id));
    expect(v2.modules).toHaveLength(2);
    expect(v2.assessments[0].questions.map((q) => q.text)).toEqual(["Q1 new", "Q2 new", "Q3 new"]);
    expect(v2.assessments[0].questions[0].id).toBe(v1.assessments[0].questions[0].id);
    expect(v2.description).toBe("Lessons: 2");

    // Once an admin changes the course, the seed no longer touches it.
    await prisma.course.update({ where: { id: v2.id }, data: { contentSource: null } });
    write(course(["changed again"], ["Q"]));
    expect((await seed()).updated).toBe(0);
    expect((await load()).lessons).toHaveLength(2);
  });

  afterAll(async () => {
    await prisma.course.deleteMany({ where: { title: TITLE } });
    await prisma.$disconnect();
  });
});
