import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { writeWithAudit } from "../audit/record";

export type Result = { ok: true; id?: string } | { ok: false; error: string };

// Instructors can be from anywhere; the location is free text.
export async function createInstructor(
  actor: SessionUser,
  input: { name: string; bio: string; location: string; expertise: string },
): Promise<Result> {
  requireRole(actor, ["ADMIN"]);
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required" };
  const expertise = input.expertise.split(",").map((s) => s.trim()).filter(Boolean);
  const row = await writeWithAudit(
    (tx) => tx.instructor.create({ data: { name, bio: input.bio.trim() || null, location: input.location.trim() || null, expertise } }),
    (r) => ({ actorId: actor.id, action: "instructor.create", entityType: "Instructor", entityId: r.id, after: { name } }),
  );
  return { ok: true, id: row.id };
}
