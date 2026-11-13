import { connection } from "next/server";
import { currentUser } from "../../../../lib/auth/current-user";
import { getLessonFile } from "../../../../lib/learning/courses";

// Streams a lesson file to a signed-in user who may see the course. Everything else is 404.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await currentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const file = await getLessonFile(user, id);
  if (!file) return new Response("Not found", { status: 404 });

  const safeName = file.title.replace(/[^\w.-]+/g, "_") || "file";
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": file.mime,
      "content-disposition": `inline; filename="${safeName}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
