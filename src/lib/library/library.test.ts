import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import JSZip from "jszip";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { createLocalStorage } from "../storage/local";
import { signatureMatches, formatFor } from "../storage/formats";
import { validateLessonFile } from "../storage/validate";
import { safetyHeaders } from "../storage/headers";
import {
  addLibraryItem, cleanTags, deleteLibraryItem, getLibraryFile, libraryConversionsIdle, listLibrary, titleFromName, updateLibraryItem, useInCourse, useStorageForLibrary, sizeText,
} from "./library";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const JPG = Buffer.from("ffd8ffe000104a464946000101000001", "hex");
const HTML = Buffer.from("\uFEFF  <!doctype html><html><body><h1>Deck</h1><script>1</script></body></html>");
const PDF = Buffer.from("%PDF-1.4\n%fake\n");
const hasSoffice = (() => { try { execFileSync("soffice", ["--version"], { stdio: "ignore" }); return true; } catch { return false; } })();

describe("formats for the library", () => {
  it("accepts JPEG, PNG and HTML by name and content, and sandboxes HTML", () => {
    expect(formatFor("photo.JPEG", "image/jpeg")?.family).toBe("IMAGE");
    expect(formatFor("deck.html", "text/html")?.family).toBe("HTML");
    expect(formatFor("x.svg", "image/svg+xml")).toBeNull();
    expect(validateLessonFile({ filename: "a.png", mime: "image/png" })).toMatchObject({ ok: true, kind: "PICTURE", ext: "png" });
    expect(validateLessonFile({ filename: "a.htm", mime: "" })).toMatchObject({ ok: true, kind: "HTML" });
    expect(signatureMatches("png", PNG)).toBe(true);
    expect(signatureMatches("jpg", JPG)).toBe(true);
    expect(signatureMatches("png", JPG)).toBe(false);
    expect(signatureMatches("html", HTML.subarray(0, 16))).toBe(true);
    expect(signatureMatches("html", PNG)).toBe(false);
    expect(safetyHeaders("text/html")["content-security-policy"]).toMatch(/^sandbox /);
    expect(safetyHeaders("text/html")["content-security-policy"]).not.toContain("allow-same-origin");
    expect(safetyHeaders("image/png")["content-security-policy"]).toBeUndefined();
  });

  it("tidies tags, titles and sizes", () => {
    expect(cleanTags(" Networking, networking ,  Onboarding  2026,,")).toEqual(["Networking", "Onboarding 2026"]);
    expect(titleFromName("C:\\x\\01_Intro_deck.pptx")).toBe("01 Intro deck");
    expect(sizeText(1536)).toBe("2 KB");
    expect(sizeText(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("the content library", () => {
  const tag = `lib-${Date.now()}`;
  const dir = mkdtempSync(join(tmpdir(), "lms-lib-"));
  const storage = createLocalStorage(dir);
  const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
  let courseId: string;
  const put = async (ext: string, data: Buffer) => { const key = `${crypto.randomUUID()}.${ext}`; await storage.put(key, data); return key; };

  beforeAll(async () => {
    useStorageForLibrary(storage);
    admin.id = (await prisma.user.create({ data: { name: "A", email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
    const subjectId = (await prisma.subject.create({ data: { name: `${tag} s`, slug: tag, category: "TECHNICAL" } })).id;
    courseId = (await prisma.course.create({ data: { subjectId, title: `${tag} course`, level: "BASIC", passMarkPercent: 70 } })).id;
  });
  afterAll(async () => {
    useStorageForLibrary(null);
    await prisma.libraryItem.deleteMany({ where: { uploadedById: admin.id } });
    await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
    await prisma.course.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.subject.deleteMany({ where: { slug: tag } });
    await prisma.user.delete({ where: { id: admin.id } });
    await prisma.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  });

  it("stores images, HTML and PDFs, refuses disguised files, and lists them by type and tag", async () => {
    const png = await addLibraryItem(admin, { key: await put("png", PNG), fileName: "logo.png", sizeBytes: PNG.length, tags: [`${tag}-brand`] });
    const html = await addLibraryItem(admin, { key: await put("html", HTML), fileName: "vmware_deck.html", sizeBytes: HTML.length, title: "VMware deck" });
    const pdf = await addLibraryItem(admin, { key: await put("pdf", PDF), fileName: "policy.pdf", sizeBytes: PDF.length });
    expect([png.ok, html.ok, pdf.ok]).toEqual([true, true, true]);
    const fakeKey = await put("png", Buffer.from("not really a png"));
    expect(await addLibraryItem(admin, { key: fakeKey, fileName: "fake.png", sizeBytes: 16 })).toMatchObject({ ok: false });
    await expect(storage.stat(fakeKey)).rejects.toThrow(); // the refused file was removed

    const images = await listLibrary(admin, { kind: "IMAGE", tag: `${tag}-brand` });
    expect(images.items.map((i) => i.title)).toEqual(["logo"]);
    const searched = await listLibrary(admin, { q: "vmware" });
    expect(searched.items.some((i) => i.title === "VMware deck")).toBe(true);
    // HTML is served inline (sandboxed by its headers); originals download.
    const file = await getLibraryFile(admin, html.ok ? html.id! : "", false);
    expect(file).toMatchObject({ mime: "text/html", download: false });
    expect(await getLibraryFile({ ...admin, role: "EMPLOYEE" }, html.ok ? html.id! : "", false)).toBeNull();
  });

  it("adds a library file to a course as a lesson, and will not delete a file in use", async () => {
    const r = await addLibraryItem(admin, { key: await put("html", HTML), fileName: "interactive.html", sizeBytes: HTML.length });
    if (!r.ok) throw new Error(r.error);
    expect(await updateLibraryItem(admin, r.id!, { title: "Interactive deck", description: "Slides", tags: ["VMware"] })).toEqual({ ok: true, id: r.id });
    const used = await useInCourse(admin, r.id!, { courseId });
    expect(used.ok).toBe(true);
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: used.ok ? used.id! : "" } });
    expect(lesson).toMatchObject({ type: "HTML", title: "Interactive deck" });
    expect(await deleteLibraryItem(admin, r.id!)).toMatchObject({ ok: false, error: expect.stringContaining("used in 1 lesson") });
    await prisma.lesson.delete({ where: { id: lesson.id } });
    const item = await prisma.libraryItem.findUniqueOrThrow({ where: { id: r.id! } });
    expect(await deleteLibraryItem(admin, r.id!)).toMatchObject({ ok: true });
    await expect(storage.stat(item.fileKey)).rejects.toThrow();
  });

  it.skipIf(!hasSoffice)("converts a Word file to PDF in the background, keeping the original", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Library test</w:t></w:r></w:p></w:body></w:document>');
    const docx = await zip.generateAsync({ type: "nodebuffer" });
    const r = await addLibraryItem(admin, { key: await put("docx", docx), fileName: "Process note.docx", sizeBytes: docx.length });
    if (!r.ok) throw new Error(r.error);
    expect(await useInCourse(admin, r.id!, { courseId })).toMatchObject({ ok: false, error: expect.stringContaining("still being converted") });
    await libraryConversionsIdle();
    const item = await prisma.libraryItem.findUniqueOrThrow({ where: { id: r.id! } });
    expect(item.conversion).toBe("DONE");
    expect(item.fileKey).toMatch(/\.pdf$/);
    expect(item.sourceFileKey).toMatch(/\.docx$/);
    expect((await storage.get(item.fileKey)).subarray(0, 5).toString()).toBe("%PDF-");
    const used = await useInCourse(admin, r.id!, { courseId, title: "Process note" });
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: used.ok ? used.id! : "" } });
    expect(lesson).toMatchObject({ type: "PDF", fileKey: item.fileKey, sourceFileKey: item.sourceFileKey, sourceFileName: "Process note.docx" });
  }, 120_000);
});
