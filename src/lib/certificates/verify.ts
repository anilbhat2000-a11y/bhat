import type { Level } from "../../generated/prisma/client";

export type VerificationView = {
  valid: boolean;
  holderName: string;
  subject: string;
  level: Level;
  issuedAt: Date;
  expiresAt: Date;
};

// What a public verification page may show: validity, name, subject, level, and dates.
// Scores and attempt details are never part of it.
export function verificationView(
  cert: { holderName: string; subject: string; level: Level; issuedAt: Date; expiresAt: Date },
  now: Date,
): VerificationView {
  return {
    valid: cert.expiresAt.getTime() > now.getTime(),
    holderName: cert.holderName,
    subject: cert.subject,
    level: cert.level,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
  };
}
