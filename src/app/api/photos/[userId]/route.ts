import { connection } from "next/server";
import { currentUser } from "../../../../lib/auth/current-user";
import { prisma } from "../../../../lib/db/client";
import { defaultStorage, mimeForKey } from "../../../../lib/storage";

// Profile photos are visible to signed-in users only. Without a photo, respond 404 and
// the page shows initials instead.
export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  await connection();
  const viewer = await currentUser();
  if (!viewer) return new Response("Not signed in", { status: 401 });
  const { userId } = await params;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { photoFileKey: true } });
  if (!user?.photoFileKey) return new Response("Not found", { status: 404 });
  const bytes = await defaultStorage().get(user.photoFileKey);
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": mimeForKey(user.photoFileKey), "cache-control": "private, no-store" },
  });
}
