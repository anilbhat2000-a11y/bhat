import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db/client";
import type { Role } from "../../generated/prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  active: boolean;
  name: string;
  email: string;
  department: string | null;
};

const LIFETIME_MS = 12 * 60 * 60 * 1000;
// A session unused for this long ends, even before its absolute expiry.
export function idleMs(env: NodeJS.ProcessEnv = process.env): number {
  const minutes = Number(env.SESSION_IDLE_MINUTES ?? 30);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 30) * 60 * 1000;
}
// lastSeenAt is written at most this often, so reading a page is not a write every time.
const TOUCH_EVERY_MS = 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, now: Date = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + LIFETIME_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt, lastSeenAt: now } });
  return { token, expiresAt };
}

// Returns null for unknown, expired, or idle tokens, and for deactivated users.
export async function readSession(token: string, now: Date = new Date(), idle: number = idleMs()): Promise<SessionUser | null> {
  const row = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!row || row.expiresAt.getTime() <= now.getTime()) return null;
  if (now.getTime() - row.lastSeenAt.getTime() > idle) return null;
  if (!row.user.active) return null;
  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    await prisma.session.update({ where: { id: row.id }, data: { lastSeenAt: now } });
  }
  const { id, role, active, name, email, department } = row.user;
  return { id, role, active, name, email, department };
}
