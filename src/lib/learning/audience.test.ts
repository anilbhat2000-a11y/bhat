import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import type { FileStorage } from "../storage/types";
import { cleanDepartments, departmentAllows, hiddenCourseIds } from "./audience";
import { assignCourse } from "./assignments";
import { listCatalogue, completeLesson } from "./progress";
import { createCourseFromFiles, titleFromFilename } from "./upload-course";

describe("department rules", () => {
  it("shows a course to everyone when it lists no departments, otherwise to its departments only", () => {
    expect(departmentAllows([], null)).toBe(true);
    expect(departmentAllows(["Sales"], " sales ")).toBe(true);
    expect(departmentAllows(["Sales"], "Accounts")).toBe(false);
    expect(departmentAllows(["Sales"], null)).toBe(false);
  });

  it("cleans department lists", () => {
    expect(cleanDepartments([" Sales ", "sales", "", "Technical  Services"])).toEqual(["Sales", "Technical Services"]);
  });

  it("turns file names into lesson titles", () => {
    expect(titleFromFilename("02_GST-basics.pdf", 1)).toBe("02 GST-basics");
    expect(titleFromFilename("03-intro.pdf", 2)).toBe("03 intro");
    expect(titleFromFilename("C:\\docs\\Intro.mp4", 0)).toBe("Intro");
    expect(titleFromFilename(".pdf", 4)).toBe("Part 5");
  });
});

describe("department-specific courses", () => {
  const tag = `aud-${Date.now()}`;
  let admin: SessionUser;
  let inDept: SessionUser;
  let other: SessionUser;
  let subjectId: string;
  const deleted: string[] = [];
  const storage: FileStorage = {
    put: async () => {}, putStream: async () => {}, get: async () => Buffer.from(""), stat: async () => ({ size: 0 }),
    delete: async (k) => { deleted.push(k); }, stream: async function* () { yield Buffer.from("%PDF-1.4\n"); },
  };

  const mk = async (name: string, role: "ADMIN" | "EMPLOYEE", department?: string): Promise<SessionUser> => {
    const u = await prisma.user.create({ data: { name, email: `${tag}-${name}@example.test`, passwordHash: "x", role, department } });
    return { id: u.id, role, active: true, name, email: u.email, department: department ?? null };
  };

  beforeAll(async () => {
    admin = await mk("admin", "ADMIN");
    inDept = await mk("in", "EMPLOYEE", `${tag} Accounts`);
    other = await mk("other", "EMPLOYEE", `${tag} Sales`);
    subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "BUSINESS" } })).id;
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
    await prisma.course.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
  });

  it("uploads PDFs as a published course for one department, mandatory for it", async () => {
    const r = await createCourseFromFiles(admin, {
      title: `${tag} month-end`, subjectId, level: "BASIC", description: "", departments: [`${tag} Accounts`],
      publish: true, mandatory: true, dueAt: null,
    }, [
      { key: "00000000-0000-4000-8000-000000000001.pdf", filename: "01 Closing checklist.pdf" },
      { key: "00000000-0000-4000-8000-000000000002.pdf", filename: "02 Reconciliations.pdf" },
    ], storage);
    expect(r).toMatchObject({ ok: true });
    const course = await prisma.course.findUniqueOrThrow({ where: { id: r.ok ? r.id : "" }, include: { lessons: { orderBy: { position: "asc" } }, assignments: true } });
    expect(course.status).toBe("PUBLISHED");
    expect(course.departments).toEqual([`${tag} Accounts`]);
    expect(course.lessons.map((l) => l.title)).toEqual(["01 Closing checklist", "02 Reconciliations"]);
    expect(course.assignments).toEqual([expect.objectContaining({ targetType: "DEPARTMENT", targetValue: `${tag} Accounts` })]);

    // Visible to the department; hidden from others, who cannot complete its lessons.
    const titles = async (u: SessionUser) => (await listCatalogue(u)).flatMap((g) => g.courses.map((c) => c.title));
    expect(await titles(inDept)).toContain(`${tag} month-end`);
    expect(await titles(other)).not.toContain(`${tag} month-end`);
    expect(await completeLesson(other, course.lessons[0].id)).toMatchObject({ ok: false });
    // Assigning it to someone outside the department makes it visible to them.
    await assignCourse(admin, { courseId: course.id, targetType: "USER", targetValue: other.id, dueAt: null });
    expect((await hiddenCourseIds(other)).has(course.id)).toBe(false);
  });

  it("refuses mandatory without departments, and removes the stored files", async () => {
    const before = deleted.length;
    const r = await createCourseFromFiles(admin, { title: `${tag} x`, subjectId, level: "BASIC", description: "", departments: [], publish: true, mandatory: true, dueAt: null },
      [{ key: "00000000-0000-4000-8000-000000000003.pdf", filename: "a.pdf" }], storage);
    expect(r).toMatchObject({ ok: false });
    expect(deleted.length).toBe(before + 1);
  });
});
