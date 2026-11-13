import { prisma } from "../db/client";

// Sign-in is refused after MAX_FAILURES failed attempts within WINDOW_MS, counted
// separately for the email and for the client IP address. A successful sign-in clears the
// email's count. Stored in Postgres, so the limit holds across app replicas and restarts.
export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export function loginKeys(email: string, ip: string | null): string[] {
  const keys = [`email:${email.trim().toLowerCase()}`];
  if (ip) keys.push(`ip:${ip}`);
  return keys;
}

export async function isLoginBlocked(keys: string[], now: Date = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - WINDOW_MS);
  for (const key of keys) {
    // The IP limit is looser, since several people can share an office NAT address.
    const limit = key.startsWith("ip:") ? MAX_FAILURES * 6 : MAX_FAILURES;
    const count = await prisma.loginFailure.count({ where: { key, at: { gt: since } } });
    if (count >= limit) return true;
  }
  return false;
}

export async function recordLoginFailure(keys: string[], now: Date = new Date()): Promise<void> {
  await prisma.loginFailure.createMany({ data: keys.map((key) => ({ key, at: now })) });
  // Old rows are no longer needed for any decision.
  await prisma.loginFailure.deleteMany({ where: { at: { lt: new Date(now.getTime() - WINDOW_MS) } } });
}

export async function clearLoginFailures(email: string): Promise<void> {
  await prisma.loginFailure.deleteMany({ where: { key: `email:${email.trim().toLowerCase()}` } });
}
