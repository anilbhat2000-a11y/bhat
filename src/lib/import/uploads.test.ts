import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { createLocalStorage } from "../storage/local";
import { formatFor, signatureMatches } from "../storage/formats";
import { validateLessonFile } from "../storage/validate";
import { convertStoredFile } from "../storage/convert";
import { parseQuestionFile, rowsFromText, correctToNumbers } from "./question-files";
import { parseQuestionRows } from "./questions";
import { questionsTemplate, questionsWordExample } from "./templates";
import { planBulkUpload, runBulkUpload, type Row } from "./bulk-courses";
import { saveLessonFile } from "../learning/courses";
import { convertLesson, useStorageForConversions } from "../learning/conversions";

const has = (cmd: string) => { try { execFileSync(cmd, [cmd === "ffmpeg" ? "-version" : "--version"], { stdio: "ignore" }); return true; } catch { return false; } };

describe("lesson file formats", () => {
  it("accepts PDF, PowerPoint, Word, Excel, MP4, MOV and MKV by extension, even with a generic type", () => {
    for (const name of ["a.pdf", "b.pptx", "c.ppt", "d.docx", "e.doc", "f.xlsx", "g.xls", "h.mp4", "i.mov", "j.mkv"]) {
      expect(formatFor(name, "application/octet-stream"), name).not.toBeNull();
    }
    expect(formatFor("x.mkv", "video/x-matroska")?.convertTo).toBe("mp4");
    expect(formatFor("x.pptx", "")?.convertTo).toBe("pdf");
    expect(formatFor("x.exe", "application/octet-stream")).toBeNull();
    expect(formatFor("x.pdf", "text/html")).toBeNull();
    expect(validateLessonFile({ filename: "deck.pptx", mime: "" })).toMatchObject({ ok: true, kind: "OFFICE" });
    expect(validateLessonFile({ filename: "page.html", mime: "text/html" })).toMatchObject({ ok: false });
  });

  it("checks file signatures", () => {
    expect(signatureMatches("pdf", Buffer.from("%PDF-1.7"))).toBe(true);
    expect(signatureMatches("pdf", Buffer.from("<html>"))).toBe(false);
    expect(signatureMatches("docx", Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(signatureMatches("xls", Buffer.from("d0cf11e0a1b11ae1", "hex"))).toBe(true);
    expect(signatureMatches("mkv", Buffer.from("1a45dfa3", "hex"))).toBe(true);
    expect(signatureMatches("mov", Buffer.concat([Buffer.from([0, 0, 0, 20]), Buffer.from("ftypqt  ")]))).toBe(true);
  });
});

describe("question files", () => {
  it("reads the Word layout, working out types and answers", () => {
    const rows = rowsFromText([
      "Q1. Which moves a running VM?", "A) HA", "B) vMotion", "Answer: B", "Explanation: vMotion moves running VMs.",
      "Q2. Pick two", "a) one", "b) two", "c) three", "Answer: A, C",
      "3. The sky is blue.", "A) True", "B) False", "Answer: True",
      "Q4) Capital of India?", "Answer: New Delhi | Delhi",
      "Q5. Explain backups.", "Type: SHORT_ANSWER", "Points: 3",
    ].join("\n"));
    expect(rows.map((r) => [r.type, r.correct])).toEqual([["SINGLE", "2"], ["MULTIPLE", "1|3"], ["TRUE_FALSE", "1"], ["FILL_BLANK", ""], ["SHORT_ANSWER", ""]]);
    expect(rows[3].options).toBe("New Delhi|Delhi");
    expect(parseQuestionRows(rows).ok).toBe(true);
  });

  it("converts letters and numbers for the correct column", () => {
    expect(correctToNumbers("B")).toBe("2");
    expect(correctToNumbers("a, c")).toBe("1|3");
    expect(correctToNumbers("2|4")).toBe("2|4");
  });

  it("reads the Excel template and the Word example", async () => {
    for (const [name, data] of [["q.xlsx", await questionsTemplate()], ["q.docx", await questionsWordExample()]] as const) {
      const p = await parseQuestionFile(name, data);
      expect(p.ok, name).toBe(true);
      if (p.ok) expect(parseQuestionRows(p.rows).ok, name).toBe(true);
    }
  });

  it("refuses other formats with a clear message", async () => {
    expect(await parseQuestionFile("q.pdf", Buffer.from("x"))).toMatchObject({ ok: false });
  });
});

describe.runIf(has("soffice") && has("ffmpeg"))("conversions", () => {
  const dir = mkdtempSync(join(tmpdir(), "lms-conv-test-"));
  const storage = createLocalStorage(join(dir, "store"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("converts a Word file to PDF and an MKV video to MP4", async () => {
    const docx = await questionsWordExample();
    await storage.put("00000000-0000-4000-8000-0000000000aa.docx", docx);
    const pdf = await convertStoredFile(storage, "00000000-0000-4000-8000-0000000000aa.docx", "pdf");
    expect(pdf.ok).toBe(true);
    if (pdf.ok) expect((await storage.get(pdf.key)).subarray(0, 5).toString()).toBe("%PDF-");

    const mkv = join(dir, "clip.mkv");
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=duration=1:size=160x120:rate=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", mkv]);
    await storage.put("00000000-0000-4000-8000-0000000000bb.mkv", readFileSync(mkv));
    const mp4 = await convertStoredFile(storage, "00000000-0000-4000-8000-0000000000bb.mkv", "mp4");
    expect(mp4.ok).toBe(true);
    if (mp4.ok) expect((await storage.get(mp4.key)).subarray(4, 8).toString()).toBe("ftyp");
  }, 180_000);
});

describe("lesson uploads and bulk course upload", () => {
  const tag = `bulk-${Date.now()}`;
  const dir = mkdtempSync(join(tmpdir(), "lms-bulk-test-"));
  const storage = createLocalStorage(join(dir, "store"));
  let admin: SessionUser;
  let subjectName: string;
  let subjectId: string;
  const pdfKey = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}.pdf`;

  beforeAll(async () => {
    const u = await prisma.user.create({ data: { name: "Bulk admin", email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN" } });
    admin = { id: u.id, role: "ADMIN", active: true, name: u.name, email: u.email, department: null };
    subjectName = `${tag} Subject`;
    subjectId = (await prisma.subject.create({ data: { name: subjectName, slug: tag, category: "TECHNICAL" } })).id;
    useStorageForConversions(storage);
  });
  afterAll(async () => {
    useStorageForConversions(null);
    await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
    await prisma.assessment.deleteMany({ where: { subjectId } });
    await prisma.course.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    rmSync(dir, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  it("refuses a file whose contents do not match its extension", async () => {
    const course = await prisma.course.create({ data: { subjectId, title: `${tag} sig`, level: "BASIC", passMarkPercent: 70 } });
    await storage.put(pdfKey(1), Buffer.from("<html>not a pdf</html>"));
    expect(await saveLessonFile(admin, course.id, { title: "Fake", key: pdfKey(1) }, storage)).toMatchObject({ ok: false });
    expect(existsSync(join(dir, "store", pdfKey(1)))).toBe(false);
  });

  it.runIf(has("soffice"))("stores a Word lesson as a document, then converts it to PDF keeping the original", async () => {
    const course = await prisma.course.create({ data: { subjectId, title: `${tag} word`, level: "BASIC", passMarkPercent: 70 } });
    const key = "00000000-0000-4000-8000-0000000000cc.docx";
    await storage.put(key, await questionsWordExample());
    const saved = await saveLessonFile(admin, course.id, { title: "Handbook", key, filename: "Handbook.docx" }, storage);
    expect(saved.ok).toBe(true);
    const id = saved.ok ? saved.id! : "";
    expect(await prisma.lesson.findUniqueOrThrow({ where: { id } })).toMatchObject({ type: "DOCUMENT", conversion: "PENDING", sourceFileName: "Handbook.docx" });
    await convertLesson(id);
    const after = await prisma.lesson.findUniqueOrThrow({ where: { id } });
    expect(after).toMatchObject({ type: "PDF", conversion: "DONE", sourceFileKey: key });
    expect(after.fileKey).toMatch(/\.pdf$/);
  }, 180_000);

  const sheetsFrom = (data: Record<string, Record<string, string>[]>) =>
    new Map(Object.entries(data).map(([k, rows]) => [k, rows.map((r, i) => ({ ...r, __row: String(i + 2) }) as Row)]));

  it("reports every problem and creates nothing when the workbook is wrong", async () => {
    const plan = await planBulkUpload(sheetsFrom({
      courses: [{ "course code": "C1", title: "", subject: "Nope", level: "Expert" }, { "course code": "C1", title: "Dup" }],
      lessons: [{ "course code": "C9", type: "File", "file name": "missing.pdf" }],
      questions: [{ "course code": "C1", type: "SINGLE", question: "Q?", "option 1": "a", correct: "1" }],
    }), []);
    const reasons = plan.problems.map((p) => `${p.where}: ${p.reason}`).join("\n");
    expect(reasons).toContain("Title is required");
    expect(reasons).toContain('Subject "Nope" is not in the portal');
    expect(reasons).toContain("Level must be");
    expect(reasons).toContain("used more than once");
    expect(reasons).toContain("Course code C9 is not on the Courses sheet");
    expect(reasons).toContain("has no lessons");
    expect(reasons).toContain("2 to 6 options");
  });

  it("creates courses with modules, file, text and link lessons and a completion check", async () => {
    await storage.put(pdfKey(2), Buffer.from("%PDF-1.4\n%%EOF\n"));
    const plan = await planBulkUpload(sheetsFrom({
      courses: [{ "course code": "C1", title: `${tag} Closing`, subject: subjectName, level: "intermediate", departments: "Accounts", publish: "Yes", mandatory: "Yes", "pass mark": "80" }],
      modules: [{ "course code": "C1", "module number": "1", "module title": "Basics", minutes: "20" }, { "course code": "C1", "module number": "2", "module title": "Practice" }],
      lessons: [
        { "course code": "C1", "module number": "2", type: "Text", "lesson title": "Key points", text: "Reconcile every account." },
        { "course code": "C1", "module number": "1", type: "File", "file name": "01 checklist.PDF" },
        { "course code": "C1", type: "Link", "lesson title": "GST portal", url: "https://www.gst.gov.in/" },
      ],
      questions: [
        { "course code": "C1", type: "SINGLE", question: "Close when?", "option 1": "Monthly", "option 2": "Never", correct: "A", explanation: "Monthly." },
        { "course code": "C1", type: "TRUE_FALSE", question: "Reconcile banks.", correct: "True", explanation: "Yes." },
      ],
    }), [{ name: "01 Checklist.pdf", key: pdfKey(2), caption: false }]);
    expect(plan.problems).toEqual([]);
    const report = await runBulkUpload(admin, plan, storage);
    expect(report.courses).toHaveLength(1);
    const r = report.courses[0];
    expect(r).toMatchObject({ modules: 2, lessons: 3, questions: 2, status: "Published" });
    const course = await prisma.course.findUniqueOrThrow({ where: { id: r.id }, include: { lessons: { orderBy: { position: "asc" }, include: { module: true } }, assignments: true, assessments: { include: { questions: true } } } });
    expect(course.level).toBe("INTERMEDIATE");
    expect(course.passMarkPercent).toBe(80);
    expect(course.departments).toEqual(["Accounts"]);
    // Lessons are grouped by module order: module 1's file first, then module 2's text, then the unassigned link.
    expect(course.lessons.map((l) => [l.title, l.type, l.module?.title ?? null])).toEqual([["01 checklist", "PDF", "Basics"], ["Key points", "TEXT", "Practice"], ["GST portal", "LINK", null]]);
    expect(course.assignments).toEqual([expect.objectContaining({ targetType: "DEPARTMENT", targetValue: "Accounts" })]);
    expect(course.assessments[0]).toMatchObject({ cadence: "ONE_TIME", published: true });
    expect(course.assessments[0].questions).toHaveLength(2);

    // Uploading the same course again is refused, so nothing is duplicated.
    const again = await planBulkUpload(sheetsFrom({ courses: [{ "course code": "C1", title: `${tag} Closing`, subject: subjectName }], lessons: [{ "course code": "C1", type: "Text", "lesson title": "x", text: "y" }] }), []);
    expect(again.problems.map((p) => p.reason).join(" ")).toContain("already exists");
  });

  it("reads a real workbook built in Excel format", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Courses").addRows([["Course code", "Title", "Subject"], ["C1", "From xlsx", subjectName]]);
    wb.addWorksheet("Lessons").addRows([["Course code", "Lesson title", "Type", "Text"], ["C1", "Hello", "Text", "Body"]]);
    const file = join(dir, "courses.xlsx");
    writeFileSync(file, Buffer.from(await wb.xlsx.writeBuffer()));
    const { readSpreadsheet } = await import("./sheets");
    const sheets = await readSpreadsheet("courses.xlsx", readFileSync(file));
    const plan = await planBulkUpload(sheets as Map<string, Row[]>, []);
    expect(plan.problems).toEqual([]);
    expect(plan.courses[0].lessons[0]).toMatchObject({ title: "Hello", kind: "TEXT" });
  });
});
