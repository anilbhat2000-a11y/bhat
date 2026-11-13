import { connection } from "next/server";
import { currentUser } from "../../../../lib/auth/current-user";
import { getLessonCaption } from "../../../../lib/learning/courses";
import { defaultStorage } from "../../../../lib/storage";
import { webStream } from "../../../../lib/storage/web";

// WebVTT captions for a video lesson, under the same access rule as the video.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await currentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const caption = await getLessonCaption(user, id);
  if (!caption) return new Response("Not found", { status: 404 });
  const storage = defaultStorage();
  const { size } = await storage.stat(caption.key);
  return new Response(webStream(storage.stream(caption.key, 0, Math.max(size - 1, 0))), {
    headers: { "content-type": "text/vtt; charset=utf-8", "cache-control": "private, no-store", "content-length": String(size) },
  });
}
