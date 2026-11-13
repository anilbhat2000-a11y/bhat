import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient, Category } from "../../generated/prisma/client";
import { hashPassword } from "../auth/password";
import { parseQuestionRows } from "../import/questions";
import { slugify } from "../admin/users";

// The 17 subjects from the brief, plus Human Resources and Data and Analytics, which the
// course content needs.
export const SUBJECTS: { name: string; slug: string; category: Category }[] = [
  "Sales", "Presales", "Purchase", "Accounts", "Logistics", "Compliance", "Govt Sales", "System Integration Sales", "Human Resources",
].map((name) => ({ name, slug: slugify(name), category: "BUSINESS" as Category }))
  .concat(
    ["IT INFRA", "AUDIO VIDEO", "POWER SOLUTIONS", "NETWORKING", "PRINT SOLUTIONS", "CYBER SECURITY", "CLOUD SOLUTIONS", "HPC/AI/ML", "Server and storage", "Data and Analytics"]
      .map((name) => ({ name, slug: slugify(name), category: "TECHNICAL" as Category })),
  );

const DEMO = [
  { name: "Demo Admin", email: "admin@3c.example", role: "ADMIN" as const },
  { name: "Demo Manager", email: "manager@3c.example", role: "MANAGER" as const },
  { name: "Demo Employee", email: "employee@3c.example", role: "EMPLOYEE" as const },
];

type CourseFile = {
  slug: string;
  title: string;
  subject: string;
  level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  passMarkPercent: number;
  description: string;
  lessons: { position: number; title: string; type: "TEXT"; body: string }[];
  assessment: {
    title: string;
    level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
    passMarkPercent: number;
    questions: { type: string; text: string; options: string[]; correct: string[]; points: number }[];
  };
};

export async function runSeed(
  db: PrismaClient,
  opts: { seedPassword: string | undefined; contentDir: string },
): Promise<{ courses: number }> {
  if (!opts.seedPassword || opts.seedPassword.length < 8) {
    throw new Error("Set SEED_PASSWORD (at least 8 characters) to create the demo accounts");
  }

  for (const s of SUBJECTS) {
    await db.subject.upsert({
      where: { slug: s.slug },
      update: { name: s.name, category: s.category },
      create: { name: s.name, slug: s.slug, category: s.category },
    });
  }

  const passwordHash = await hashPassword(opts.seedPassword);
  const ids = new Map<string, string>();
  for (const u of DEMO) {
    const row = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, active: true },
      create: { name: u.name, email: u.email, role: u.role, passwordHash },
    });
    ids.set(u.email, row.id);
  }
  await db.user.update({ where: { email: DEMO[1].email }, data: { managerId: ids.get(DEMO[0].email) } });
  await db.user.update({ where: { email: DEMO[2].email }, data: { managerId: ids.get(DEMO[1].email) } });

  const files = readdirSync(opts.contentDir).filter((f) => f.endsWith(".json")).sort();
  for (const f of files) {
    const course = JSON.parse(readFileSync(join(opts.contentDir, f), "utf8")) as CourseFile;
    await loadCourse(db, course, f);
  }
  return { courses: files.length };
}

// Loads one course with its lessons and completion check. Matched by subject and title,
// so re-running the seed skips courses that already exist. Invalid content fails loudly.
async function loadCourse(db: PrismaClient, c: CourseFile, file: string): Promise<void> {
  const subject = await db.subject.findUnique({ where: { name: c.subject } });
  if (!subject) throw new Error(`${file}: unknown subject "${c.subject}"`);
  if (await db.course.findFirst({ where: { subjectId: subject.id, title: c.title } })) return;

  const rows = c.assessment.questions.map((q) => ({
    type: q.type,
    text: q.text,
    options: q.options.join("|"),
    correct: q.correct.map((label) => {
      const index = q.options.indexOf(label);
      if (index < 0) throw new Error(`${file}: correct answer "${label}" is not an option`);
      return String(index + 1);
    }).join("|"),
    points: String(q.points),
  }));
  const parsed = parseQuestionRows(rows);
  if (!parsed.ok) throw new Error(`${file}: ${parsed.errors.map((e) => `question ${e.row}: ${e.reason}`).join("; ")}`);

  await db.course.create({
    data: {
      subjectId: subject.id,
      title: c.title,
      description: c.description,
      level: c.level,
      status: "PUBLISHED",
      passMarkPercent: c.passMarkPercent,
      lessons: { create: c.lessons.map((l) => ({ position: l.position, title: l.title, type: l.type, body: l.body })) },
      assessments: {
        create: {
          subjectId: subject.id,
          title: c.assessment.title,
          cadence: "ONE_TIME",
          level: c.assessment.level,
          passMarkPercent: c.assessment.passMarkPercent,
          published: true,
          questions: {
            create: parsed.questions.map((q, i) => ({
              position: i + 1,
              type: q.type,
              text: q.text,
              options: q.options,
              correctOptionIds: q.correctOptionIds,
              points: q.points,
            })),
          },
        },
      },
    },
  });
}
