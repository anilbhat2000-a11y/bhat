import type { Level } from "../../generated/prisma/client";

const LEVEL_RANK: Record<Level, number> = { BASIC: 1, INTERMEDIATE: 2, ADVANCED: 3 };

// Adds whole months in UTC. Days that do not exist in the target month roll forward,
// so 31 Jan + 1 month is 3 Mar (2026 is not a leap year), as the test pins.
export function expiresAt(issuedAt: Date, validityMonths: number): Date {
  return new Date(
    Date.UTC(
      issuedAt.getUTCFullYear(),
      issuedAt.getUTCMonth() + validityMonths,
      issuedAt.getUTCDate(),
      issuedAt.getUTCHours(),
      issuedAt.getUTCMinutes(),
      issuedAt.getUTCSeconds(),
      issuedAt.getUTCMilliseconds(),
    ),
  );
}

// Expiry at exactly `now` counts as expired.
export function isActive(cert: { expiresAt: Date }, now: Date): boolean {
  return cert.expiresAt.getTime() > now.getTime();
}

export function highestActiveLevelPerSubject(
  certs: { subjectId: string; level: Level; expiresAt: Date }[],
  now: Date,
): Map<string, Level> {
  const best = new Map<string, Level>();
  for (const cert of certs) {
    if (!isActive(cert, now)) continue;
    const current = best.get(cert.subjectId);
    if (!current || LEVEL_RANK[cert.level] > LEVEL_RANK[current]) best.set(cert.subjectId, cert.level);
  }
  return best;
}
