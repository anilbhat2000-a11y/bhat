import { prisma } from "../db/client";
import { isActive } from "../assessments/certifications";

// The learner's own certifications only. Callers pass the learner's id, never another's.
export async function myCertifications(userId: string, now: Date = new Date()) {
  const rows = await prisma.certification.findMany({
    where: { userId },
    include: { subject: true },
    orderBy: [{ subject: { name: "asc" } }, { issuedAt: "desc" }],
  });
  return rows.map((c) => ({
    id: c.id,
    subject: c.subject.name,
    level: c.level,
    issuedAt: c.issuedAt,
    expiresAt: c.expiresAt,
    active: isActive({ expiresAt: c.expiresAt }, now),
    verificationCode: c.verificationCode,
  }));
}
