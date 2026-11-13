import { Readable, Transform } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import busboy from "busboy";
import { currentUser } from "../../../../lib/auth/current-user";
import { saveLessonFile } from "../../../../lib/learning/courses";
import { defaultStorage } from "../../../../lib/storage";
import { sizeLimitBytes, validateUpload, type UploadKind } from "../../../../lib/storage/validate";

// Hard ceiling for any upload, so a client cannot stream without end. The per-type limit
// (PDF, video) is applied while the file is read.
const HARD_CEILING = 600 * 1024 * 1024;
const MB = 1024 * 1024;

function redirectTo(to: string, message: string, kind: "notice" | "error"): Response {
  return new Response(null, {
    status: 303,
    headers: { location: `${to}?${kind}=${encodeURIComponent(message)}` },
  });
}

// Browsers send Origin on cross-site form posts. The session cookie is SameSite=Lax, so this
// is a second check, not the only one.
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

// Streams a lesson file from an admin's form into storage. The bytes are written to disk as
// they arrive; the lesson is recorded only after the whole file is stored within its limit.
export async function POST(request: Request): Promise<Response> {
  const actor = await currentUser();
  if (!actor) return new Response(null, { status: 303, headers: { location: "/login" } });
  if (actor.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!request.body || !(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    return new Response("Expected a multipart upload", { status: 400 });
  }

  const fields = new Map<string, string>();
  let storedKey: string | null = null;
  let courseTo = "/admin/courses";
  let problem: string | null = null;
  let tooLarge = false;
  const storage = defaultStorage();
  const writes: Promise<void>[] = [];

  const parser = busboy({
    headers: Object.fromEntries(request.headers),
    limits: { files: 1, fields: 10, fieldSize: 1024, fileSize: HARD_CEILING },
  });

  parser.on("field", (name, value) => fields.set(name, value));

  parser.on("file", (name, file, info) => {
    // Fields must come before the file, so the rules are known before any byte is stored.
    if (name !== "file" || storedKey || problem) {
      file.resume();
      return;
    }
    const courseId = fields.get("courseId") ?? "";
    if (!courseId) {
      problem = "Choose a course before the file";
      file.resume();
      return;
    }
    courseTo = `/admin/courses/${encodeURIComponent(courseId)}`;
    const kind: UploadKind | null = fields.get("type") === "VIDEO" ? "VIDEO" : fields.get("type") === "PDF" ? "DOCUMENT" : null;
    if (!kind) {
      problem = "Choose PDF or video for the lesson type";
      file.resume();
      return;
    }
    // The pre-check uses the declared type and name only; size is checked as bytes arrive.
    const checked = validateUpload({ filename: info.filename ?? "", mime: info.mimeType, sizeBytes: 0 }, kind);
    if (!checked.ok) {
      problem = checked.reason;
      file.resume();
      return;
    }
    storedKey = checked.key;
    const limit = sizeLimitBytes(kind);
    let seen = 0;
    const meter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        seen += chunk.length;
        // Past the limit, bytes are dropped rather than stored; the file is removed below.
        if (seen > limit) {
          tooLarge = true;
          callback();
          return;
        }
        callback(null, chunk);
      },
    });
    file.on("limit", () => {
      tooLarge = true;
    });
    file.pipe(meter);
    writes.push(storage.putStream(checked.key, meter));
  });

  const body = Readable.fromWeb(request.body as unknown as WebReadableStream<Uint8Array>);
  await new Promise<void>((resolve, reject) => {
    parser.on("close", resolve);
    parser.on("error", reject);
    body.on("error", reject);
    body.pipe(parser);
  }).catch(() => {
    problem ??= "The upload was interrupted. Nothing was stored.";
  });

  try {
    await Promise.all(writes);
  } catch {
    problem ??= "The file could not be stored. Nothing was stored.";
  }

  if (storedKey && (problem || tooLarge)) await storage.delete(storedKey);
  if (problem) return redirectTo(courseTo, problem, "error");
  if (!storedKey) return redirectTo(courseTo, "Choose a file to upload", "error");
  if (tooLarge) {
    const kind = fields.get("type") === "VIDEO" ? "VIDEO" : "DOCUMENT";
    return redirectTo(courseTo, `File is too large: the size limit is ${sizeLimitBytes(kind) / MB} MB`, "error");
  }

  const result = await saveLessonFile(
    actor,
    fields.get("courseId") ?? "",
    { title: fields.get("title") ?? "", type: fields.get("type") === "VIDEO" ? "VIDEO" : "PDF", key: storedKey },
    storage,
  );
  if (!result.ok) return redirectTo(courseTo, result.error, "error");
  return redirectTo(courseTo, "File uploaded", "notice");
}
