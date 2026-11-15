import { connection } from "next/server";
import { currentUser } from "../../../../lib/auth/current-user";
import { getLibraryFile } from "../../../../lib/library/library";
import { defaultStorage } from "../../../../lib/storage";
import { webStream } from "../../../../lib/storage/web";
import { parseRange } from "../../../../lib/storage/range";
import { safetyHeaders } from "../../../../lib/storage/headers";

const MAX_PART = 8 * 1024 * 1024;

// Streams a content-library file to an admin, for preview (inline) or download (?original=1
// or ?download=1). Supports ranges so videos can seek. HTML is served in a sandbox.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await currentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const sp = new URL(request.url).searchParams;
  const file = await getLibraryFile(user, id, sp.get("original") === "1");
  if (!file) return new Response("Not found", { status: 404 });
  const storage = defaultStorage();
  const { size } = await storage.stat(file.key);
  const safeName = file.name.replace(/[^\w.-]+/g, "_") || "file";
  const common: Record<string, string> = {
    "content-type": file.mime,
    "content-disposition": `${file.download || sp.get("download") === "1" ? "attachment" : "inline"}; filename="${safeName}"`,
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
    ...safetyHeaders(file.mime),
  };
  if (size === 0) return new Response(new Uint8Array(0), { headers: { ...common, "content-length": "0" } });
  const range = parseRange(request.headers.get("range"), size);
  if (range.kind === "unsatisfiable") return new Response(null, { status: 416, headers: { ...common, "content-range": `bytes */${size}` } });
  if (range.kind === "partial") {
    const start = range.start;
    const end = Math.min(range.end, start + MAX_PART - 1);
    const chunks: Uint8Array[] = [];
    for await (const c of storage.stream(file.key, start, end)) chunks.push(c);
    const body = Buffer.concat(chunks);
    return new Response(body, { status: 206, headers: { ...common, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(body.length) } });
  }
  return new Response(webStream(storage.stream(file.key, 0, size - 1)), { status: 200, headers: { ...common, "content-length": String(size) } });
}
