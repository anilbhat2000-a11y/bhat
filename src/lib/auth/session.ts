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

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, now: Date = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + LIFETIME_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

// Returns null for unknown or expired tokens, and for deactivated users.
export async function readSession(token: string, now: Date = new Date()): Promise<SessionUser | null> {
  const row = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!row || row.expiresAt.getTime() <= now.getTime()) return null;
  if (!row.user.active) return null;
  const { id, role, active, name, email, department } = row.user;
  return { id, role, active, name, email, department };
}
