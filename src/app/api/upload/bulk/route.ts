import { Readable, Transform } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import busboy from "busboy";
import yauzl from "yauzl";
import { currentUser } from "../../../../lib/auth/current-user";
import { prisma } from "../../../../lib/db/client";
import { defaultStorage } from "../../../../lib/storage";
import type { FileStorage } from "../../../../lib/storage/types";
import { sizeLimitBytes, validateLessonFile, validateUpload } from "../../../../lib/storage/validate";
import { readSpreadsheet } from "../../../../lib/import/sheets";
import { planBulkUpload, runBulkUpload, type BulkReport, type StoredFile } from "../../../../lib/import/bulk-courses";
import type { Prisma } from "../../../../generated/prisma/client";

const MB = 1024 * 1024;
const FORM = "/admin/courses/bulk";
const MAX_FILES = 500;
const MAX_WORKBOOK = 20 * MB;
const MAX_ZIP_TOTAL = 20 * 1024 * MB; // uncompressed, across all entries

function redirectTo(to: string): Response {
  return new Response(null, { status: 303, headers: { location: to } });
}
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
const baseName = (name: string) => name.replace(/^.*[\\/]/, "");
const isWorkbookName = (name: string) => /\.(xlsx|xls)$/i.test(name) && /(bulk|course|template)/i.test(baseName(name));

// A metered copy: bytes past `limit` are dropped and `onTooBig` is called once.
function meter(limit: number, onTooBig: () => void) {
  let seen = 0;
  let told = false;
  return new Transform({
    transform(chunk: Buffer, _e, cb) {
      seen += chunk.length;
      if (seen > limit) {
        if (!told) { told = true; onTooBig(); }
        cb();
        return;
      }
      cb(null, chunk);
    },
  });
}

// Stores one lesson or caption file under a new key; returns a problem message or null.
function prepare(name: string, mime: string): { key: string; limit: number; caption: boolean } | { error: string } {
  if (/\.vtt$/i.test(name)) {
    const c = validateUpload({ filename: name, mime: "text/vtt", sizeBytes: 0 }, "CAPTION");
    return c.ok ? { key: c.key, limit: sizeLimitBytes("CAPTION"), caption: true } : { error: c.reason };
  }
  const v = validateLessonFile({ filename: name, mime });
  return v.ok ? { key: v.key, limit: sizeLimitBytes(v.kind), caption: false } : { error: v.reason };
}

async function extractZip(path: string, storage: FileStorage, files: StoredFile[], problems: string[], workbook: { name: string; data: Buffer } | null) {
  let found = workbook;
  await new Promise<void>((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true, autoClose: true }, (err, zip) => {
      if (err || !zip) return reject(new Error("The ZIP file could not be opened. Make it again with Windows (right-click → Send to → Compressed folder)."));
      let total = 0;
      let count = 0;
      zip.on("error", reject);
      zip.on("end", resolve);
      zip.on("entry", (entry: yauzl.Entry) => {
        const name = baseName(entry.fileName);
        if (/\/$/.test(entry.fileName) || entry.fileName.startsWith("__MACOSX/") || name.startsWith(".") || name === "Thumbs.db") return zip.readEntry();
        count++;
        total += entry.uncompressedSize;
        if (count > MAX_FILES || total > MAX_ZIP_TOTAL) { problems.push(`The ZIP has too many files or is too large (at most ${MAX_FILES} files, 20 GB uncompressed)`); zip.close(); return resolve(); }
        if (!found && isWorkbookName(name)) {
          if (entry.uncompressedSize > MAX_WORKBOOK) { problems.push("The workbook is too large (20 MB at most)"); return zip.readEntry(); }
          zip.openReadStream(entry, async (e, stream) => {
            if (e || !stream) { problems.push(`"${name}" in the ZIP could not be read`); return zip.readEntry(); }
            const chunks: Buffer[] = [];
            for await (const c of stream) chunks.push(c as Buffer);
            found = { name, data: Buffer.concat(chunks) };
            zip.readEntry();
          });
          return;
        }
        const p = prepare(name, "");
        if ("error" in p) { problems.push(p.error); return zip.readEntry(); }
        if (entry.uncompressedSize > p.limit) { problems.push(`"${name}" is too large: the limit is ${p.limit / MB} MB`); return zip.readEntry(); }
        if (files.some((f) => f.name.toLowerCase() === name.toLowerCase())) { problems.push(`Two files are called "${name}"`); return zip.readEntry(); }
        zip.openReadStream(entry, (e, stream) => {
          if (e || !stream) { problems.push(`"${name}" in the ZIP could not be read`); return zip.readEntry(); }
          files.push({ name, key: p.key, caption: p.caption });
          const m = meter(p.limit, () => problems.push(`"${name}" is too large: the limit is ${p.limit / MB} MB`));
          stream.on("error", (er) => m.destroy(er));
          storage.putStream(p.key, stream.pipe(m)).then(() => zip.readEntry(), (er) => { problems.push(`"${name}" could not be stored: ${(er as Error).message}`); zip.readEntry(); });
        });
      });
      zip.readEntry();
    });
  });
  return found;
}

// Bulk course upload: the workbook, then lesson files (selected individually, in one ZIP, or
// both). Every file is stored first; the workbook is checked against them; if anything is
// wrong nothing is created and the stored files are removed. The result is kept as an audit
// event and shown on the bulk upload page.
export async function POST(request: Request): Promise<Response> {
  const actor = await currentUser();
  if (!actor) return new Response(null, { status: 303, headers: { location: "/login" } });
  if (actor.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!request.body || !(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    return new Response("Expected a multipart upload", { status: 400 });
  }

  const storage = defaultStorage();
  const files: StoredFile[] = [];
  const problems: string[] = [];
  const writes: Promise<void>[] = [];
  let workbook: { name: string; data: Buffer } | null = null;
  const tmp = await mkdtemp(join(tmpdir(), "lms-bulk-"));
  const zips: string[] = [];

  const parser = busboy({ headers: Object.fromEntries(request.headers), limits: { files: MAX_FILES + 5, fields: 20, fieldSize: 1024, fileSize: 4096 * MB } });
  parser.on("filesLimit", () => problems.push(`Upload at most ${MAX_FILES} files at a time`));
  parser.on("file", (field, file, info) => {
    const name = baseName(info.filename ?? "");
    if (!name) { file.resume(); return; }
    if (field === "workbook") {
      const chunks: Buffer[] = [];
      let size = 0;
      file.on("data", (c: Buffer) => { size += c.length; if (size <= MAX_WORKBOOK) chunks.push(c); });
      file.on("end", () => { if (size > MAX_WORKBOOK) problems.push("The workbook is too large (20 MB at most)"); else workbook = { name, data: Buffer.concat(chunks) }; });
      return;
    }
    if (field === "package") {
      if (!/\.zip$/i.test(name)) { problems.push(`"${name}" is not a ZIP file`); file.resume(); return; }
      const path = join(tmp, `${zips.length}.zip`);
      zips.push(path);
      file.on("limit", () => problems.push(`"${name}" is larger than 4 GB. Split the files into smaller ZIPs.`));
      writes.push(pipeline(file, createWriteStream(path)));
      return;
    }
    if (field !== "files") { file.resume(); return; }
    const p = prepare(name, info.mimeType);
    if ("error" in p) { problems.push(p.error); file.resume(); return; }
    if (files.some((f) => f.name.toLowerCase() === name.toLowerCase())) { problems.push(`Two files are called "${name}"`); file.resume(); return; }
    files.push({ name, key: p.key, caption: p.caption });
    const m = meter(p.limit, () => problems.push(`"${name}" is too large: the limit is ${p.limit / MB} MB`));
    file.pipe(m);
    writes.push(storage.putStream(p.key, m));
  });

  try {
    const body = Readable.fromWeb(request.body as unknown as WebReadableStream<Uint8Array>);
    await new Promise<void>((resolve, reject) => {
      parser.on("close", resolve);
      parser.on("error", reject);
      body.on("error", reject);
      body.pipe(parser);
    }).catch(() => { problems.push("The upload was interrupted. Nothing was created."); });
    await Promise.all(writes).catch(() => { problems.push("A file could not be stored. Nothing was created."); });
    for (const z of zips) {
      if (problems.length > 0) break;
      try {
        workbook = await extractZip(z, storage, files, problems, workbook);
      } catch (e) {
        problems.push((e as Error).message);
      }
    }

    let report: BulkReport;
    const wb = workbook as { name: string; data: Buffer } | null;
    if (!wb && problems.length === 0) problems.push("Choose the Excel workbook (download the template from this page)");
    if (problems.length === 0 && wb) {
      let sheets;
      try {
        sheets = await readSpreadsheet(wb.name, wb.data);
      } catch (e) {
        problems.push(`Workbook: ${(e as Error).message}`);
      }
      if (sheets) {
        const plan = await planBulkUpload(sheets, files);
        if (plan.problems.length === 0) {
          report = await runBulkUpload(actor, plan, storage);
          return redirectTo(`${FORM}?report=${await saveReport(actor.id, report, wb.name)}`);
        }
        for (const f of files) await storage.delete(f.key);
        report = { ok: false, problems: plan.problems, warnings: [], courses: [] };
        return redirectTo(`${FORM}?report=${await saveReport(actor.id, report, wb.name)}`);
      }
    }
    for (const f of files) await storage.delete(f.key);
    report = { ok: false, problems: problems.map((reason) => ({ where: "Upload", reason })), warnings: [], courses: [] };
    return redirectTo(`${FORM}?report=${await saveReport(actor.id, report, wb?.name ?? "")}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function saveReport(actorId: string, report: BulkReport, workbook: string): Promise<string> {
  const trimmed = { ...report, problems: report.problems.slice(0, 300), workbook };
  const ev = await prisma.auditEvent.create({
    data: { actorId, action: report.ok ? "course.bulk-upload" : "course.bulk-upload-rejected", entityType: "BulkUpload", entityId: "-", after: trimmed as unknown as Prisma.InputJsonValue },
  });
  return ev.id;
}
