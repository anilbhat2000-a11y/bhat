import type { PrismaClient } from "../../generated/prisma/client";
import { hashPassword } from "../auth/password";
import { recordAudit } from "../audit/record";
import { DEMO } from "../seed/run";

// Audit actor for changes made from the server command line, not by a signed-in user.
export const CLI_ACTOR = "system:cli";

export const DEMO_EMAILS = DEMO.map((u) => u.email);

// Deactivates the seeded demo accounts and ends their sessions. Refuses when no real (non-
// demo) admin is active, because that would leave nobody able to use the admin portal.
export async function deactivateDemoAccounts(
  db: PrismaClient,
): Promise<{ ok: true; deactivated: string[] } | { ok: false; error: string }> {
  const realAdmins = await db.user.count({ where: { role: "ADMIN", active: true, email: { notIn: DEMO_EMAILS } } });
  if (realAdmins === 0) {
    return { ok: false, error: "No real admin account is active. Create one first (npm run db:create-admin), or nobody could manage the LMS." };
  }
  const targets = await db.user.findMany({ where: { email: { in: DEMO_EMAILS }, active: true }, select: { id: true, email: true } });
  await db.$transaction(async (tx) => {
    for (const u of targets) {
      await tx.user.update({ where: { id: u.id }, data: { active: false } });
      await tx.session.deleteMany({ where: { userId: u.id } });
      await recordAudit(tx, { actorId: CLI_ACTOR, action: "user.deactivate", entityType: "User", entityId: u.id, before: { active: true }, after: { active: false, reason: "demo account" } });
    }
  });
  return { ok: true, deactivated: targets.map((u) => u.email) };
}

// Creates (or promotes and reactivates) an admin account from the command line.
export async function createAdmin(
  db: PrismaClient,
  input: { name: string; email: string; password: string },
): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Give a valid email address" };
  if (DEMO_EMAILS.includes(email)) return { ok: false, error: "Use a real email address, not a demo account" };
  if (!name) return { ok: false, error: "Give the admin's name" };
  if (input.password.length < 12) return { ok: false, error: "Use a password of at least 12 characters" };
  const passwordHash = await hashPassword(input.password);
  const existing = await db.user.findUnique({ where: { email } });
  const user = await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", active: true, passwordHash, name },
    create: { email, name, role: "ADMIN", passwordHash, department: "Learning and Development" },
  });
  await recordAudit(db, { actorId: CLI_ACTOR, action: existing ? "user.update" : "user.create", entityType: "User", entityId: user.id, after: { email, role: "ADMIN", active: true } });
  return { ok: true, created: !existing };
}
