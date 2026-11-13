import { connection } from "next/server";
import { currentUser } from "../../../../lib/auth/current-user";
import { getLessonFile } from "../../../../lib/learning/courses";
import { defaultStorage } from "../../../../lib/storage";
import { webStream } from "../../../../lib/storage/web";
import { parseRange } from "../../../../lib/storage/range";

const MAX_PART = 8 * 1024 * 1024;

// Streams a lesson file to a signed-in user who may see the course. Supports HTTP range
// requests, so a browser can seek and resume a video without downloading it again.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await currentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const file = await getLessonFile(user, id);
  if (!file) return new Response("Not found", { status: 404 });

  const storage = defaultStorage();
  const { size } = await storage.stat(file.key);
  const safeName = file.title.replace(/[^\w.-]+/g, "_") || "file";
  const common = {
    "content-type": file.mime,
    "content-disposition": `inline; filename="${safeName}"`,
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  };

  if (size === 0) return new Response(new Uint8Array(0), { headers: { ...common, "content-length": "0" } });
  const range = parseRange(request.headers.get("range"), size);
  if (range.kind === "unsatisfiable") {
    return new Response(null, { status: 416, headers: { ...common, "content-range": `bytes */${size}` } });
  }
  if (range.kind === "partial") {
    // Each response carries at most 8 MB; the player asks for the next part. This keeps
    // memory bounded, and a buffered part keeps its exact Content-Length.
    const start = range.start;
    const end = Math.min(range.end, start + MAX_PART - 1);
    const chunks: Uint8Array[] = [];
    for await (const c of storage.stream(file.key, start, end)) chunks.push(c);
    const body = Buffer.concat(chunks);
    return new Response(body, {
      status: 206,
      headers: { ...common, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(body.length) },
    });
  }
  return new Response(webStream(storage.stream(file.key, 0, size - 1)), {
    status: 200,
    headers: { ...common, "content-length": String(size) },
  });
}
