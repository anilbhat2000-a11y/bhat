import type { Role } from "../../generated/prisma/client";
import type { SessionUser } from "./session";
import { reportingLineIds, type UserRef } from "./scope";

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403, message?: string) {
    super(message ?? (status === 401 ? "Not signed in" : "Forbidden"));
    this.name = "AuthError";
  }
}

export function requireRole(user: SessionUser | null, allowed: Role[]): SessionUser {
  if (!user) throw new AuthError(401);
  if (!allowed.includes(user.role)) throw new AuthError(403);
  return user;
}

export function canViewUser(viewer: { id: string; role: Role }, targetId: string, users: UserRef[]): boolean {
  if (viewer.role === "ADMIN") return true;
  if (viewer.id === targetId) return true;
  if (viewer.role === "MANAGER") return reportingLineIds(viewer.id, users).has(targetId);
  return false;
}
