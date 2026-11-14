import { createHash } from "node:crypto";
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

// Sample organisation from brief section 11: 3 departments, 1 admin, 2 managers, 3 employees.
// All are placeholders and should be removed before real use.
export const DEPARTMENTS = ["Learning and Development", "Sales", "Technical Services"] as const;
export const DEMO = [
  { name: "Demo Admin", email: "admin@3c.example", role: "ADMIN" as const, department: "Learning and Development", jobTitle: "L&D Administrator", manager: null },
  { name: "Demo Manager", email: "manager@3c.example", role: "MANAGER" as const, department: "Sales", jobTitle: "Sales Manager", manager: "admin@3c.example" },
  { name: "Demo Manager (Technical)", email: "manager2@3c.example", role: "MANAGER" as const, department: "Technical Services", jobTitle: "Technical Services Manager", manager: "admin@3c.example" },
  { name: "Demo Employee", email: "employee@3c.example", role: "EMPLOYEE" as const, department: "Sales", jobTitle: "Account Manager", manager: "manager@3c.example" },
  { name: "Demo Employee 2", email: "employee2@3c.example", role: "EMPLOYEE" as const, department: "Sales", jobTitle: "Inside Sales Executive", manager: "manager@3c.example" },
  { name: "Demo Employee 3", email: "employee3@3c.example", role: "EMPLOYEE" as const, department: "Technical Services", jobTitle: "Network Engineer", manager: "manager2@3c.example" },
];

type BankFile = {
  subject: string;
  course: string;
  title: string;
  cadence: "WEEKLY" | "MONTHLY" | "ANNUAL" | "ONE_TIME";
  level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  passMarkPercent: number;
  timeLimitMinutes: number | null;
  questionsPerAttempt: number | null;
  assignDepartment: string | null;
  questions: SeedQuestion[];
};

// Correct answers are written as option text. FILL_BLANK, MATCHING ("left=right") and
// SHORT_ANSWER define their answers in the options, so `correct` is left empty for them.
type SeedQuestion = { type: string; text: string; options: string[]; correct: string[]; points: number; scenario?: string; explanation?: string };

type CourseFile = {
  slug: string;
  title: string;
  subject: string;
  level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  passMarkPercent: number;
  description: string;
  // Optional: modules with estimated minutes; each lesson names its module by number (1-based).
  modules?: { title: string; minutes: number }[];
  lessons: { position: number; title: string; type: "TEXT"; body: string; module?: number }[];
  // Sources and further reading, shown on the course page.
  sources?: { title: string; url: string }[];
  assessment: {
    title: string;
    level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
    passMarkPercent: number;
    questions: SeedQuestion[];
  };
};

export async function runSeed(
  db: PrismaClient,
  opts: { seedPassword: string | undefined; contentDir: string; bankDir?: string },
): Promise<{ courses: number; banks: number; updated: number }> {
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
    const fields = { name: u.name, role: u.role, department: u.department, jobTitle: u.jobTitle };
    const row = await db.user.upsert({
      where: { email: u.email },
      // Never reactivates: once the demo accounts are deactivated, re-running the seed
      // (for example to load new content) leaves them off.
      update: fields,
      create: { ...fields, email: u.email, passwordHash },
    });
    ids.set(u.email, row.id);
  }
  for (const u of DEMO) {
    await db.user.update({ where: { email: u.email }, data: { managerId: u.manager ? ids.get(u.manager) : null } });
  }

  const files = readdirSync(opts.contentDir).filter((f) => f.endsWith(".json")).sort();
  let updated = 0;
  for (const f of files) {
    const text = readFileSync(join(opts.contentDir, f), "utf8");
    const course = JSON.parse(text) as CourseFile;
    if ((await loadCourse(db, course, f, createHash("sha256").update(text).digest("hex"))) === "updated") updated++;
  }

  const bankDir = opts.bankDir ?? join(opts.contentDir, "..", "question-banks");
  const banks = readdirSync(bankDir).filter((f) => f.endsWith(".json")).sort();
  for (const f of banks) {
    const bank = JSON.parse(readFileSync(join(bankDir, f), "utf8")) as BankFile;
    await loadBank(db, bank, f);
  }
  return { courses: files.length, banks: banks.length, updated };
}

// Turns the human-readable question format (correct answers as option text) into rows the
// spreadsheet importer validates, so seeded questions pass the same checks as uploads.
function toQuestionRows(questions: BankFile["questions"], file: string) {
  const rows = questions.map((q) => ({
    type: q.type,
    text: q.text,
    options: q.options.join("|"),
    correct: q.correct.map((label) => {
      const index = q.options.indexOf(label);
      if (index < 0) throw new Error(`${file}: correct answer "${label}" is not an option`);
      return String(index + 1);
    }).join("|"),
    points: String(q.points),
    scenario: q.scenario,
    explanation: q.explanation,
  }));
  const parsed = parseQuestionRows(rows);
  if (!parsed.ok) throw new Error(`${file}: ${parsed.errors.map((e) => `question ${e.row}: ${e.reason}`).join("; ")}`);
  return parsed.questions;
}

// Loads a recurring assessment and its question bank, assigned to a department. Matched by
// title, so re-running the seed skips banks that already exist.
async function loadBank(db: PrismaClient, b: BankFile, file: string): Promise<void> {
  const subject = await db.subject.findUnique({ where: { name: b.subject } });
  if (!subject) throw new Error(`${file}: unknown subject "${b.subject}"`);
  if (await db.assessment.findFirst({ where: { subjectId: subject.id, title: b.title } })) return;
  const course = await db.course.findFirst({ where: { subjectId: subject.id, title: b.course } });
  if (!course) throw new Error(`${file}: unknown course "${b.course}"`);
  const questions = toQuestionRows(b.questions, file);

  await db.assessment.create({
    data: {
      subjectId: subject.id,
      courseId: course.id,
      title: b.title,
      cadence: b.cadence,
      level: b.level,
      passMarkPercent: b.passMarkPercent,
      timeLimitMinutes: b.timeLimitMinutes,
      questionsPerAttempt: b.questionsPerAttempt,
      showAnswersAfterSubmit: true,
      published: true,
      questions: {
        create: questions.map((q, i) => ({
          position: i + 1, type: q.type, text: q.text, options: q.options, correctOptionIds: q.correctOptionIds, points: q.points, scenario: q.scenario, explanation: q.explanation,
        })),
      },
      assignments: b.assignDepartment ? { create: { targetType: "DEPARTMENT", targetValue: b.assignDepartment } } : undefined,
    },
  });
}

// Loads one course with its lessons and completion check. Matched by subject and title,
// so re-running the seed skips courses that already exist. Invalid content fails loudly.
// Creates the course from its file, or refreshes it in place when the file has changed and
// the course is still seed-managed (no admin has changed its lessons or modules).
async function loadCourse(db: PrismaClient, c: CourseFile, file: string, hash: string): Promise<"created" | "updated" | "unchanged"> {
  const subject = await db.subject.findUnique({ where: { name: c.subject } });
  if (!subject) throw new Error(`${file}: unknown subject "${c.subject}"`);
  const existing = await db.course.findFirst({ where: { subjectId: subject.id, title: c.title } });
  if (existing) {
    if (existing.contentSource !== "seed" || existing.contentHash === hash) return "unchanged";
    await syncCourse(db, existing.id, c, file, hash);
    return "updated";
  }

  const parsed = { questions: toQuestionRows(c.assessment.questions, file) };
  for (const l of c.lessons) {
    if (l.module !== undefined && !(c.modules && l.module >= 1 && l.module <= c.modules.length)) {
      throw new Error(`${file}: lesson "${l.title}" names module ${l.module}, which does not exist`);
    }
  }

  const created = await db.course.create({
    data: {
      subjectId: subject.id,
      title: c.title,
      description: c.description,
      level: c.level,
      status: "PUBLISHED",
      passMarkPercent: c.passMarkPercent,
      contentSource: "seed",
      contentHash: hash,
      sources: c.sources ?? [],
      modules: c.modules ? { create: c.modules.map((m, i) => ({ position: i + 1, title: m.title, estimatedMinutes: m.minutes })) } : undefined,
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
              scenario: q.scenario,
              explanation: q.explanation,
            })),
          },
        },
      },
    },
    include: { modules: true },
  });
  const moduleId = new Map(created.modules.map((m) => [m.position, m.id]));
  await db.lesson.createMany({
    data: c.lessons.map((l) => ({
      courseId: created.id, position: l.position, title: l.title, type: l.type, body: l.body,
      moduleId: l.module !== undefined ? moduleId.get(l.module) ?? null : null,
    })),
  });
  return "created";
}

// Refreshes a seed-managed course from its file. Modules, lessons and questions are matched
// by position and updated in place, so learners' progress and past attempts keep pointing at
// the same records; extra items in the file are added, and items beyond it are removed.
async function syncCourse(db: PrismaClient, courseId: string, c: CourseFile, file: string, hash: string): Promise<void> {
  for (const l of c.lessons) {
    if (l.module !== undefined && !(c.modules && l.module >= 1 && l.module <= c.modules.length)) {
      throw new Error(`${file}: lesson "${l.title}" names module ${l.module}, which does not exist`);
    }
  }
  const questions = toQuestionRows(c.assessment.questions, file);
  await db.$transaction(async (tx) => {
    await tx.course.update({ where: { id: courseId }, data: { description: c.description, sources: c.sources ?? [], contentHash: hash } });

    const modules = c.modules ?? [];
    const moduleIds = new Map<number, string>();
    for (const [i, m] of modules.entries()) {
      const row = await tx.module.upsert({
        where: { courseId_position: { courseId, position: i + 1 } },
        update: { title: m.title, estimatedMinutes: m.minutes },
        create: { courseId, position: i + 1, title: m.title, estimatedMinutes: m.minutes },
      });
      moduleIds.set(i + 1, row.id);
    }
    await tx.module.deleteMany({ where: { courseId, position: { gt: modules.length } } });

    for (const l of c.lessons) {
      const data = { title: l.title, type: l.type, body: l.body, moduleId: l.module !== undefined ? moduleIds.get(l.module) ?? null : null };
      await tx.lesson.upsert({
        where: { courseId_position: { courseId, position: l.position } },
        update: data,
        create: { courseId, position: l.position, ...data },
      });
    }
    await tx.lesson.deleteMany({ where: { courseId, position: { gt: c.lessons.length } } });

    const assessment = await tx.assessment.findFirst({ where: { courseId, cadence: "ONE_TIME" }, orderBy: { title: "asc" } });
    if (assessment) {
      await tx.assessment.update({ where: { id: assessment.id }, data: { title: c.assessment.title, passMarkPercent: c.assessment.passMarkPercent } });
      for (const [i, q] of questions.entries()) {
        const data = { type: q.type, text: q.text, options: q.options, correctOptionIds: q.correctOptionIds, points: q.points, scenario: q.scenario, explanation: q.explanation };
        await tx.question.upsert({
          where: { assessmentId_position: { assessmentId: assessment.id, position: i + 1 } },
          update: data,
          create: { assessmentId: assessment.id, position: i + 1, ...data },
        });
      }
      await tx.question.deleteMany({ where: { assessmentId: assessment.id, position: { gt: questions.length } } });
    }
  }, { timeout: 30_000 });
}
