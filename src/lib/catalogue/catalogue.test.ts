import { it, expect, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../db/client";
import { SUBJECTS } from "../seed/run";
import { loadCatalogue, renderCatalogueMarkdown, seedCatalogueDrafts, validateCatalogue, LEVELS } from "./catalogue";
import type { Level } from "../../generated/prisma/client";

const cat = loadCatalogue();
const existing = readdirSync("content/courses").map((f) => {
  const c = JSON.parse(readFileSync(join("content/courses", f), "utf8")) as { subject: string; level: Level; title: string };
  return { subject: c.subject, level: c.level, title: c.title };
});
const BRIEF_SUBJECTS = SUBJECTS.map((s) => s.name).filter((n) => n !== "Human Resources" && n !== "Data and Analytics");

afterAll(async () => {
  await prisma.$disconnect();
});

it("covers the 17 subjects of the brief at all three levels, with objectives, modules and prerequisites", () => {
  expect(BRIEF_SUBJECTS).toHaveLength(17);
  expect(cat.subjects).toHaveLength(17);
  expect(validateCatalogue(cat, BRIEF_SUBJECTS, existing)).toEqual([]);
  expect(cat.subjects.flatMap((s) => LEVELS.map((l) => s.levels[l]))).toHaveLength(51);
});

it("reports problems: missing subjects, objective counts, wrong prerequisites, unknown linked courses", () => {
  const broken = structuredClone(cat);
  broken.subjects = broken.subjects.slice(1);
  broken.subjects[0].levels.BASIC.objectives = ["one"];
  broken.subjects[0].levels.ADVANCED.prerequisites = [];
  broken.subjects[0].levels.INTERMEDIATE.existingCourse = "No such course";
  const problems = validateCatalogue(broken, BRIEF_SUBJECTS, existing);
  expect(problems).toEqual(expect.arrayContaining([
    "missing subject Sales",
    expect.stringContaining("3 to 6 objectives"),
    expect.stringContaining("prerequisite must be the level below"),
    expect.stringContaining('"No such course" does not exist'),
  ]));
});

it("keeps docs/CATALOGUE.md in step with content/catalogue.json", () => {
  expect(readFileSync("docs/CATALOGUE.md", "utf8")).toBe(renderCatalogueMarkdown(cat));
});

it("creates draft shells with modules for courses not yet in the portal, once", async () => {
  // Uses a copy of one subject renamed to a test subject, so the shared test database is
  // not filled with 30 drafts.
  const tag = `cat-${Date.now()}`;
  const subject = await prisma.subject.create({ data: { name: `${tag} subject`, slug: tag, category: "TECHNICAL" } });
  const one = structuredClone(cat.subjects.find((s) => s.subject === "Presales")!);
  one.subject = subject.name;
  const sample = { ...cat, subjects: [one] };
  expect(await seedCatalogueDrafts(prisma, sample)).toBe(3);
  expect(await seedCatalogueDrafts(prisma, sample)).toBe(0);
  const courses = await prisma.course.findMany({ where: { subjectId: subject.id }, include: { modules: { orderBy: { position: "asc" } } }, orderBy: { level: "asc" } });
  expect(courses.map((c) => [c.level, c.status])).toEqual([["BASIC", "DRAFT"], ["INTERMEDIATE", "DRAFT"], ["ADVANCED", "DRAFT"]]);
  expect(courses[0].modules.map((m) => m.title)).toEqual(one.levels.BASIC.modules.map((m) => m.title));
  expect(courses[1].description).toContain("Prerequisite: Presales Basic");
  await prisma.course.deleteMany({ where: { subjectId: subject.id } });
  await prisma.subject.delete({ where: { id: subject.id } });
});
