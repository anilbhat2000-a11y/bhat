import { Readable, Transform } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import busboy from "busboy";
import { currentUser } from "../../../../lib/auth/current-user";
import { defaultStorage } from "../../../../lib/storage";
import { sizeLimitBytes, validateLessonFile } from "../../../../lib/storage/validate";
import { addLibraryItem, cleanTags } from "../../../../lib/library/library";

const MB = 1024 * 1024;
const MAX_FILES = 50;
const FORM = "/admin/library";

function back(message: string, kind: "notice" | "error"): Response {
  return new Response(null, { status: 303, headers: { location: `${FORM}?${kind}=${encodeURIComponent(message)}` } });
}
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}

type Stored = { key: string; name: string; size: number; tooLarge: boolean; limit: number };

// Uploads one or more files into the content library. Each file is streamed straight to
// storage within its size limit, then checked and recorded. Files that fail are reported;
// the others are kept.
export async function POST(request: Request): Promise<Response> {
  const actor = await currentUser();
  if (!actor) return new Response(null, { status: 303, headers: { location: "/login" } });
  if (actor.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!request.body || !(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    return new Response("Expected a multipart upload", { status: 400 });
  }
  const storage = defaultStorage();
  const fields = new Map<string, string>();
  const stored: Stored[] = [];
  const problems: string[] = [];
  const writes: Promise<void>[] = [];
  const parser = busboy({ headers: Object.fromEntries(request.headers), limits: { files: MAX_FILES, fields: 10, fieldSize: 4000, fileSize: 600 * MB } });
  parser.on("field", (name, value) => fields.set(name, value));
  parser.on("filesLimit", () => problems.push(`Upload at most ${MAX_FILES} files at a time`));
  parser.on("file", (name, file, info) => {
    const fileName = (info.filename ?? "").replace(/^.*[\\/]/, "");
    if (name !== "files" || !fileName) { file.resume(); return; }
    const checked = validateLessonFile({ filename: fileName, mime: info.mimeType });
    if (!checked.ok) { problems.push(checked.reason); file.resume(); return; }
    const entry: Stored = { key: checked.key, name: fileName, size: 0, tooLarge: false, limit: sizeLimitBytes(checked.kind) };
    stored.push(entry);
    const meter = new Transform({
      transform(chunk: Buffer, _e, cb) {
        entry.size += chunk.length;
        if (entry.size > entry.limit) { entry.tooLarge = true; cb(); return; }
        cb(null, chunk);
      },
    });
    file.on("limit", () => { entry.tooLarge = true; });
    file.on("error", (e) => meter.destroy(e));
    file.pipe(meter);
    writes.push(storage.putStream(checked.key, meter));
  });

  const body = Readable.fromWeb(request.body as unknown as WebReadableStream<Uint8Array>);
  let interrupted = false;
  await new Promise<void>((resolve, reject) => {
    parser.on("close", resolve);
    parser.on("error", reject);
    body.on("error", reject);
    body.pipe(parser);
  }).catch(() => { interrupted = true; });
  const results = await Promise.allSettled(writes);
  if (interrupted || results.some((r) => r.status === "rejected")) {
    for (const s of stored) await storage.delete(s.key).catch(() => {});
    return back("The upload was interrupted. Nothing was saved; please try again.", "error");
  }

  const single = stored.length === 1;
  const tags = cleanTags(fields.get("tags") ?? "");
  let added = 0;
  for (const s of stored) {
    if (s.tooLarge) {
      await storage.delete(s.key).catch(() => {});
      problems.push(`"${s.name}" is too large: the limit for this type is ${s.limit / MB} MB`);
      continue;
    }
    const r = await addLibraryItem(actor, {
      key: s.key, fileName: s.name, sizeBytes: s.size, tags,
      title: single ? fields.get("title") : undefined, description: single ? fields.get("description") : undefined,
    }, storage);
    if (r.ok) added++; else problems.push(r.error);
  }
  if (added === 0) return back(problems.join(" · ") || "Choose at least one file", "error");
  const converting = stored.some((s) => /\.(pptx?|docx?|xlsx?|mov|mkv)$/i.test(s.name));
  const note = `Added ${added} file${added === 1 ? "" : "s"} to the library.${converting ? " Office files and MOV/MKV videos are being converted for viewing; this can take a minute." : ""}`;
  return back(problems.length ? `${note} Not added: ${problems.join(" · ")}` : note, problems.length ? "error" : "notice");
}
