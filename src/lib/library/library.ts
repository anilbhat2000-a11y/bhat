import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { recordAudit, writeWithAudit } from "../audit/record";
import { defaultStorage, mimeForKey } from "../storage";
import type { FileStorage } from "../storage/types";
import { FORMATS, signatureMatches, type FileFamily } from "../storage/formats";
import { convertStoredFile } from "../storage/convert";
import { markCustomised } from "../learning/courses";
import { assignLessonModules } from "../learning/modules";
import type { LessonType, Prisma } from "../../generated/prisma/client";

// The content library: admins upload files once (PDF, video, PowerPoint, Word, Excel, JPEG,
// PNG, HTML), find them again by type, tag or name, preview them, and add them to any course
// as a lesson. Office files are converted to PDF and MOV/MKV videos to MP4 in the background;
// the original is always kept. A file used in a lesson cannot be deleted from the library.

export type Result = { ok: true; id?: string } | { ok: false; error: string };
export const KIND_LABEL: Record<FileFamily, string> = { PDF: "PDF", VIDEO: "Video", OFFICE: "Office document", IMAGE: "Image", HTML: "HTML page" };
export function sizeText(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

const asAdmin = (actor: SessionUser) => requireRole(actor, ["ADMIN"]);
let storageForTests: FileStorage | null = null;
export function useStorageForLibrary(s: FileStorage | null) { storageForTests = s; }
const store = () => storageForTests ?? defaultStorage();

export function cleanTags(raw: string | string[]): string[] {
  const list = (Array.isArray(raw) ? raw : raw.split(",")).map((t) => t.trim().replace(/\s+/g, " ").slice(0, 40)).filter(Boolean);
  const seen = new Set<string>();
  return list.filter((t) => !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase())).slice(0, 15);
}

export function titleFromName(name: string): string {
  const base = name.replace(/^.*[\\/]/, "").replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return (base || "Untitled").slice(0, 200);
}

// Records a file already written to storage. Checks the file really is what its name says;
// on any problem the stored file is removed so nothing is left behind.
export async function addLibraryItem(
  actor: SessionUser,
  input: { key: string; fileName: string; sizeBytes: number; title?: string; description?: string; tags?: string[] },
  storage: FileStorage = store(),
): Promise<Result> {
  asAdmin(actor);
  const fail = async (error: string): Promise<Result> => { await storage.delete(input.key).catch(() => {}); return { ok: false, error }; };
  const ext = input.key.split(".").pop() ?? "";
  const format = FORMATS.find((f) => f.ext === ext);
  if (!format) return fail(`"${input.fileName}": this file type is not supported`);
  const head: Uint8Array[] = [];
  try {
    for await (const c of storage.stream(input.key, 0, 15)) head.push(c);
  } catch {
    return fail(`"${input.fileName}" could not be read`);
  }
  if (!signatureMatches(ext, Buffer.concat(head))) return fail(`"${input.fileName}" does not look like a real ${format.label} file. Check it opens on your computer.`);
  const convert = !!format.convertTo;
  const item = await writeWithAudit(
    (tx) => tx.libraryItem.create({
      data: {
        title: (input.title?.trim() || titleFromName(input.fileName)).slice(0, 200),
        description: input.description?.trim().slice(0, 2000) || null,
        tags: cleanTags(input.tags ?? []),
        kind: format.family,
        fileKey: input.key,
        sourceFileKey: convert ? input.key : null,
        fileName: input.fileName.replace(/^.*[\\/]/, "").slice(0, 200),
        sizeBytes: BigInt(Math.max(0, Math.round(input.sizeBytes))),
        conversion: convert ? "PENDING" : null,
        uploadedById: actor.id,
      },
    }),
    (i) => ({ actorId: actor.id, action: "library.upload", entityType: "LibraryItem", entityId: i.id, after: { title: i.title, kind: i.kind, file: i.fileName } }),
  );
  if (convert) queueLibraryConversion(item.id);
  return { ok: true, id: item.id };
}

// --- Background conversion --------------------------------------------------------------

const queue: string[] = [];
const queued = new Set<string>();
let running: Promise<void> | null = null;

export function queueLibraryConversion(id: string): void {
  if (queued.has(id)) return;
  queued.add(id);
  queue.push(id);
  running ??= (async () => {
    try {
      while (queue.length > 0) {
        const next = queue.shift() as string;
        try { await convertLibraryItem(next); } catch (e) { console.error("library conversion failed", next, (e as Error).message); } finally { queued.delete(next); }
      }
    } finally { running = null; }
  })();
}

// For tests: resolves when the queue is empty.
export async function libraryConversionsIdle(): Promise<void> {
  while (running) await running;
}

export async function convertLibraryItem(id: string): Promise<"DONE" | "FAILED" | "SKIPPED"> {
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.conversion !== "PENDING" || !item.sourceFileKey) return "SKIPPED";
  const format = FORMATS.find((f) => f.ext === item.sourceFileKey!.split(".").pop());
  if (!format?.convertTo) {
    await prisma.libraryItem.update({ where: { id }, data: { conversion: "FAILED", conversionError: "No conversion for this format" } });
    return "FAILED";
  }
  const storage = store();
  const result = await convertStoredFile(storage, item.sourceFileKey, format.convertTo);
  if (!result.ok) {
    await prisma.libraryItem.update({ where: { id }, data: { conversion: "FAILED", conversionError: result.reason.slice(0, 500) } });
    return "FAILED";
  }
  const updated = await prisma.libraryItem.updateMany({ where: { id, conversion: "PENDING" }, data: { fileKey: result.key, conversion: "DONE", conversionError: null } });
  if (updated.count === 0) await storage.delete(result.key);
  return "DONE";
}

export async function resumeLibraryConversions(): Promise<void> {
  const pending = await prisma.libraryItem.findMany({ where: { conversion: "PENDING" }, select: { id: true }, orderBy: { createdAt: "asc" } });
  for (const p of pending) queueLibraryConversion(p.id);
}

// --- Reading ----------------------------------------------------------------------------

export type LibraryFilters = { q?: string; kind?: FileFamily; tag?: string; sort?: "new" | "old" | "name" | "size" };

export async function listLibrary(actor: SessionUser, f: LibraryFilters = {}) {
  asAdmin(actor);
  const q = f.q?.trim();
  const where: Prisma.LibraryItemWhereInput = {
    ...(f.kind ? { kind: f.kind } : {}),
    ...(f.tag ? { tags: { has: f.tag } } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { fileName: { contains: q, mode: "insensitive" } }, { tags: { has: q } }] } : {}),
  };
  const orderBy: Prisma.LibraryItemOrderByWithRelationInput = f.sort === "old" ? { createdAt: "asc" } : f.sort === "name" ? { title: "asc" } : f.sort === "size" ? { sizeBytes: "desc" } : { createdAt: "desc" };
  const [items, all] = await Promise.all([
    prisma.libraryItem.findMany({ where, orderBy }),
    prisma.libraryItem.findMany({ select: { kind: true, tags: true, sizeBytes: true } }),
  ]);
  const usage = await usageCounts(items.flatMap((i) => [i.fileKey, i.sourceFileKey].filter((k): k is string => !!k)));
  return {
    items: items.map((i) => ({ ...i, sizeBytes: Number(i.sizeBytes), usedIn: (usage.get(i.fileKey) ?? 0) + (i.sourceFileKey && i.sourceFileKey !== i.fileKey ? usage.get(i.sourceFileKey) ?? 0 : 0) })),
    counts: Object.fromEntries((["PDF", "VIDEO", "OFFICE", "IMAGE", "HTML"] as const).map((k) => [k, all.filter((a) => a.kind === k).length])) as Record<FileFamily, number>,
    total: all.length,
    totalBytes: all.reduce((n, a) => n + Number(a.sizeBytes), 0),
    tags: [...new Set(all.flatMap((a) => a.tags))].sort((a, b) => a.localeCompare(b)),
  };
}

async function usageCounts(keys: string[]): Promise<Map<string, number>> {
  if (keys.length === 0) return new Map();
  const rows = await prisma.lesson.findMany({ where: { OR: [{ fileKey: { in: keys } }, { sourceFileKey: { in: keys } }] }, select: { fileKey: true, sourceFileKey: true } });
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = r.sourceFileKey && keys.includes(r.sourceFileKey) ? r.sourceFileKey : r.fileKey;
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export async function getLibraryItem(actor: SessionUser, id: string) {
  asAdmin(actor);
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item) return null;
  const keys = [item.fileKey, item.sourceFileKey].filter((k): k is string => !!k);
  const lessons = await prisma.lesson.findMany({
    where: { OR: [{ fileKey: { in: keys } }, { sourceFileKey: { in: keys } }] },
    select: { id: true, title: true, course: { select: { id: true, title: true, status: true } } },
    orderBy: { course: { title: "asc" } },
  });
  return { ...item, sizeBytes: Number(item.sizeBytes), lessons };
}

// The file to send for a library preview or download (admins only).
export async function getLibraryFile(actor: SessionUser, id: string, original: boolean): Promise<{ key: string; mime: string; name: string; download: boolean } | null> {
  if (actor.role !== "ADMIN") return null;
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item) return null;
  if (original || (item.kind === "OFFICE" && item.conversion !== "DONE")) {
    const key = item.sourceFileKey ?? item.fileKey;
    return { key, mime: mimeForKey(key), name: item.fileName, download: true };
  }
  const ext = item.fileKey.split(".").pop();
  return { key: item.fileKey, mime: mimeForKey(item.fileKey), name: `${titleFromName(item.title)}.${ext}`, download: false };
}

// --- Changing ---------------------------------------------------------------------------

export async function updateLibraryItem(actor: SessionUser, id: string, patch: { title: string; description: string; tags: string[] }): Promise<Result> {
  asAdmin(actor);
  const before = await prisma.libraryItem.findUnique({ where: { id }, select: { title: true, description: true, tags: true } });
  if (!before) return { ok: false, error: "File not found" };
  const title = patch.title.trim().slice(0, 200);
  if (!title) return { ok: false, error: "Enter a title" };
  await writeWithAudit(
    (tx) => tx.libraryItem.update({ where: { id }, data: { title, description: patch.description.trim().slice(0, 2000) || null, tags: cleanTags(patch.tags) } }),
    () => ({ actorId: actor.id, action: "library.update", entityType: "LibraryItem", entityId: id, before, after: { title, tags: cleanTags(patch.tags) } }),
  );
  return { ok: true, id };
}

export async function deleteLibraryItem(actor: SessionUser, id: string): Promise<Result> {
  asAdmin(actor);
  const item = await getLibraryItem(actor, id);
  if (!item) return { ok: false, error: "File not found" };
  if (item.lessons.length > 0) {
    return { ok: false, error: `"${item.title}" is used in ${item.lessons.length} lesson${item.lessons.length === 1 ? "" : "s"}. Remove those lessons first.` };
  }
  await prisma.$transaction(async (tx) => {
    await tx.libraryItem.delete({ where: { id } });
    await recordAudit(tx, { actorId: actor.id, action: "library.delete", entityType: "LibraryItem", entityId: id, before: { title: item.title, file: item.fileName } });
  });
  const storage = store();
  for (const k of new Set([item.fileKey, item.sourceFileKey].filter((x): x is string => !!x))) await storage.delete(k).catch(() => {});
  return { ok: true, id };
}

// Adds a library file to a course as a new lesson. The lesson shares the library's stored
// file (nothing is copied). Waits for a conversion that is still running.
export async function useInCourse(actor: SessionUser, id: string, input: { courseId: string; title?: string; moduleId?: string }): Promise<Result> {
  asAdmin(actor);
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "File not found" };
  if (item.conversion === "PENDING") return { ok: false, error: "This file is still being converted. Try again in a minute." };
  const course = await prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true, status: true } });
  if (!course) return { ok: false, error: "Choose a course" };
  if (course.status === "ARCHIVED") return { ok: false, error: "That course is archived. Restore it to draft first." };
  const convertedOk = item.conversion === "DONE";
  const type: LessonType = item.kind === "PDF" ? "PDF" : item.kind === "VIDEO" ? "VIDEO" : item.kind === "IMAGE" ? "IMAGE" : item.kind === "HTML" ? "HTML"
    : convertedOk ? "PDF" : "DOCUMENT"; // Office: the converted PDF, or the original as a download
  const title = (input.title?.trim() || item.title).slice(0, 200);
  const last = await prisma.lesson.findFirst({ where: { courseId: course.id }, orderBy: { position: "desc" }, select: { position: true } });
  const lesson = await writeWithAudit(
    (tx) => tx.lesson.create({
      data: {
        courseId: course.id, position: (last?.position ?? 0) + 1, title, type, fileKey: item.fileKey,
        ...(item.sourceFileKey ? { sourceFileKey: item.sourceFileKey, sourceFileName: item.fileName, conversion: item.conversion } : {}),
      },
    }),
    (l) => ({ actorId: actor.id, action: "library.use", entityType: "Lesson", entityId: l.id, after: { courseId: course.id, libraryItemId: id, type } }),
  );
  await markCustomised(course.id);
  if (input.moduleId) {
    const placed = await assignLessonModules(actor, course.id, { [lesson.id]: input.moduleId });
    if (!placed.ok) return { ok: false, error: `Lesson added, but not placed in the module: ${placed.error}` };
  }
  return { ok: true, id: lesson.id };
}
