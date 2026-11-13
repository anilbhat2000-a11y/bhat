import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { prisma } from "../db/client";

export type AuditEvent = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

// Appends one event. There is deliberately no function here that changes or removes one.
// Accepts the shared client or a transaction client.
export async function recordAudit(db: Pick<PrismaClient, "auditEvent">, event: AuditEvent): Promise<void> {
  await db.auditEvent.create({
    data: {
      actorId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      before: (event.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (event.after ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

// The fields whose values differ between before and after, sorted by name.
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .sort();
}

// The log holds actor ids without a foreign key, so history survives a user being removed.
// Newest first, optionally limited to one entity type or one entity.
export async function listAudit(filter: { entityType?: string; entityId?: string; limit?: number } = {}) {
  return prisma.auditEvent.findMany({
    where: {
      ...(filter.entityType && { entityType: filter.entityType }),
      ...(filter.entityId && { entityId: filter.entityId }),
    },
    orderBy: [{ at: "desc" }, { id: "desc" }],
    take: filter.limit ?? 200,
  });
}
