import { prisma } from "./db/client";
import { recordAudit } from "./audit/record";

// Data retention (company decision, 2026-11-14: keep data for 1 year). RETENTION_DAYS sets
// the period. Kept regardless: user accounts, course content, course progress and
// completions, and certificates that are valid or expired less than a year ago.
export function retentionDays(env: Record<string, string | undefined> = process.env): number {
  const days = Number(env.RETENTION_DAYS ?? 365);
  return Number.isInteger(days) && days >= 30 ? days : 365;
}

export type PurgeCounts = Record<
  "periodsAndAttempts" | "expiredCertificates" | "auditEvents" | "notifications" | "announcements" | "coursePosts" | "feedback" | "remedialPlans" | "sessions",
  number
>;

// `onlyUserIds` limits the purge to those people's data (used by tests, which share one
// database with other tests running at the same time).
export async function purgeOldData(now: Date = new Date(), days: number = retentionDays(), onlyUserIds?: string[]): Promise<PurgeCounts> {
  const cutoff = new Date(now.getTime() - days * 24 * 3600_000);
  const user = onlyUserIds ? { userId: { in: onlyUserIds } } : {};
  const counts = await prisma.$transaction(async (tx) => {
    const c: PurgeCounts = {
      // Attempts are deleted with their period (cascade).
      periodsAndAttempts: (await tx.assessmentPeriod.deleteMany({ where: { ...user, dueAt: { lt: cutoff } } })).count,
      expiredCertificates: (await tx.certification.deleteMany({ where: { ...user, expiresAt: { lt: cutoff } } })).count,
      auditEvents: (await tx.auditEvent.deleteMany({ where: { ...(onlyUserIds ? { actorId: { in: onlyUserIds } } : {}), at: { lt: cutoff } } })).count,
      notifications: (await tx.notification.deleteMany({ where: { ...user, sentAt: { lt: cutoff } } })).count,
      announcements: (await tx.announcement.deleteMany({ where: { ...(onlyUserIds ? { createdById: { in: onlyUserIds } } : {}), createdAt: { lt: cutoff } } })).count,
      // Replies go with their question (cascade).
      coursePosts: (await tx.coursePost.deleteMany({ where: { ...user, parentId: null, createdAt: { lt: cutoff } } })).count,
      feedback: (await tx.courseFeedback.deleteMany({ where: { ...user, createdAt: { lt: cutoff } } })).count,
      remedialPlans: (await tx.remedialPlan.deleteMany({ where: { ...user, status: "DONE", closedAt: { lt: cutoff } } })).count,
      sessions: (await tx.session.deleteMany({ where: { ...user, expiresAt: { lt: now } } })).count,
    };
    // Record what was purged (counts only), so the log shows the policy at work.
    const total = Object.entries(c).filter(([k]) => k !== "sessions").reduce((sum, [, n]) => sum + n, 0);
    if (total > 0) {
      await recordAudit(tx, { actorId: "system:retention", action: "retention.purge", entityType: "System", entityId: "retention", after: { days, cutoff: cutoff.toISOString(), ...c } });
    }
    return c;
  });
  return counts;
}
