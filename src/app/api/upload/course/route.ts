import { Readable, Transform } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import busboy from "busboy";
import { currentUser } from "../../../../lib/auth/current-user";
import { defaultStorage } from "../../../../lib/storage";
import { sizeLimitBytes, validateLessonFile } from "../../../../lib/storage/validate";
import { createCourseFromFiles, type UploadedFile } from "../../../../lib/learning/upload-course";
import { parseQuestionFile } from "../../../../lib/import/question-files";
import { addCompletionCheckQuestions } from "../../../../lib/assessments/admin";
import type { Level } from "../../../../generated/prisma/client";

const HARD_CEILING = 600 * 1024 * 1024;
const MAX_FILES = 30;
const MB = 1024 * 1024;
const FORM = "/admin/courses/upload";

function redirectTo(to: string, message: string, kind: "notice" | "error"): Response {
  return new Response(null, { status: 303, headers: { location: `${to}?${kind}=${encodeURIComponent(message)}` } });
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
// A date field (YYYY-MM-DD) means the end of that day, India time.
function dueDate(value: string | undefined): Date | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59+05:30`) : null;
}

// Builds a course from several PDF and MP4 files in one form. Each file is streamed to
// storage within its size limit; the course and lessons are created after every file is in.
export async function POST(request: Request): Promise<Response> {
  const actor = await currentUser();
  if (!actor) return new Response(null, { status: 303, headers: { location: "/login" } });
  if (actor.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!request.body || !(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    return new Response("Expected a multipart upload", { status: 400 });
  }

  const fields = new Map<string, string>();
  const departments: string[] = [];
  const files: UploadedFile[] = [];
  const writes: Promise<void>[] = [];
  let problem: string | null = null;
  let questions: { name: string; data: Buffer } | null = null;
  const storage = defaultStorage();

  const parser = busboy({ headers: Object.fromEntries(request.headers), limits: { files: MAX_FILES, fields: 60, fieldSize: 4096, fileSize: HARD_CEILING } });
  parser.on("field", (name, value) => {
    if (name === "department") departments.push(value);
    else fields.set(name, value);
  });
  parser.on("filesLimit", () => { problem ??= `Upload at most ${MAX_FILES} files at a time`; });
  parser.on("file", (name, file, info) => {
    // Optional questions file (Excel, CSV or Word): read into memory, at most 20 MB.
    if (name === "questions" && info.filename && !problem) {
      const chunks: Buffer[] = [];
      let size = 0;
      file.on("data", (c: Buffer) => {
        size += c.length;
        if (size <= 20 * MB) chunks.push(c);
      });
      file.on("end", () => {
        if (size > 20 * MB) problem ??= "The questions file is too large (20 MB at most)";
        else questions = { name: info.filename ?? "questions", data: Buffer.concat(chunks) };
      });
      return;
    }
    if (name !== "files" || problem || !info.filename) {
      file.resume();
      return;
    }
    const checked = validateLessonFile({ filename: info.filename, mime: info.mimeType });
    if (!checked.ok) {
      problem = checked.reason;
      file.resume();
      return;
    }
    const limit = sizeLimitBytes(checked.kind);
    let seen = 0;
    const meter = new Transform({
      transform(chunk: Buffer, _e, callback) {
        seen += chunk.length;
        if (seen > limit) {
          problem ??= `"${info.filename}" is too large: the limit is ${limit / MB} MB`;
          callback();
          return;
        }
        callback(null, chunk);
      },
    });
    files.push({ key: checked.key, filename: info.filename });
    file.pipe(meter);
    writes.push(storage.putStream(checked.key, meter));
  });

  const body = Readable.fromWeb(request.body as unknown as WebReadableStream<Uint8Array>);
  await new Promise<void>((resolve, reject) => {
    parser.on("close", resolve);
    parser.on("error", reject);
    body.on("error", reject);
    body.pipe(parser);
  }).catch(() => { problem ??= "The upload was interrupted. Nothing was stored."; });
  try {
    await Promise.all(writes);
  } catch {
    problem ??= "A file could not be stored. Nothing was stored.";
  }
  // Questions are checked before anything is created, so a mistake in them stops the upload.
  let questionRows: Awaited<ReturnType<typeof parseQuestionFile>> | null = null;
  const q = questions as { name: string; data: Buffer } | null;
  if (!problem && q) {
    questionRows = await parseQuestionFile(q.name, q.data);
    if (!questionRows.ok) problem = `Questions file: ${questionRows.error}`;
  }
  if (problem) {
    for (const f of files) await storage.delete(f.key);
    return redirectTo(FORM, problem, "error");
  }

  const level = (["BASIC", "INTERMEDIATE", "ADVANCED"].includes(fields.get("level") ?? "") ? fields.get("level") : "BASIC") as Level;
  const result = await createCourseFromFiles(actor, {
    title: fields.get("title") ?? "",
    subjectId: fields.get("subjectId") ?? "",
    level,
    description: fields.get("description") ?? "",
    departments: [...departments, ...(fields.get("otherDepartments") ?? "").split(",")],
    publish: fields.get("publish") === "on",
    mandatory: fields.get("mandatory") === "on",
    dueAt: dueDate(fields.get("dueDate")),
  }, files, storage);
  if (!result.ok) return redirectTo(FORM, result.error, "error");
  let message = result.message;
  if (questionRows?.ok) {
    const added = await addCompletionCheckQuestions(actor, result.id, questionRows.rows);
    message += added.ok
      ? ` Added a completion check with ${added.created} questions.`
      : ` The questions were not added: ${added.errors.slice(0, 3).map((e) => `${questionRows.ok ? questionRows.rows[e.row - 1]?.source ?? `row ${e.row}` : ""}: ${e.reason}`).join("; ")}. Fix the file and import it on the course's assessment page.`;
  }
  return redirectTo(`/admin/courses/${encodeURIComponent(result.id)}`, message, "notice");
}
