import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { reportingLineIds } from "../auth/scope";
import { isActive } from "../assessments/certifications";

// Who a viewer may report on: admins see everyone, managers see their reporting line.
export async function scopeFor(viewer: SessionUser): Promise<Set<string> | null> {
  if (viewer.role === "ADMIN") return null;
  const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
  return reportingLineIds(viewer.id, all);
}

const inScope = (scope: Set<string> | null, userId: string) => scope === null || scope.has(userId);

export async function certificationRows(viewer: SessionUser, now: Date = new Date()) {
  const scope = await scopeFor(viewer);
  const certs = await prisma.certification.findMany({ include: { user: true, subject: true }, orderBy: { issuedAt: "desc" } });
  return certs
    .filter((c) => inScope(scope, c.userId))
    .map((c) => ({
      name: c.user.name,
      email: c.user.email,
      department: c.user.department ?? "",
      subject: c.subject.name,
      level: c.level,
      issued: c.issuedAt.toISOString().slice(0, 10),
      expires: c.expiresAt.toISOString().slice(0, 10),
      status: isActive({ expiresAt: c.expiresAt }, now) ? "Active" : "Expired",
      expiresAt: c.expiresAt,
    }));
}

// Company-wide, admin only: per department, attempts, passes, and overdue periods.
export async function companyHealthRows(viewer: SessionUser) {
  if (viewer.role !== "ADMIN") return null;
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { status: "SUBMITTED" },
    include: { user: true },
  });
  const overdue = await prisma.assessmentPeriod.findMany({ where: { status: "OVERDUE" }, include: { user: true } });
  const depts = new Map<string, { department: string; attempts: number; passed: number; overdue: number }>();
  const row = (name: string) => depts.get(name) ?? { department: name, attempts: 0, passed: 0, overdue: 0 };
  for (const a of attempts) {
    const d = row(a.user.department ?? "");
    d.attempts += 1;
    if (a.passed) d.passed += 1;
    depts.set(d.department, d);
  }
  for (const p of overdue) {
    const d = row(p.user.department ?? "");
    d.overdue += 1;
    depts.set(d.department, d);
  }
  return [...depts.values()]
    .sort((a, b) => a.department.localeCompare(b.department))
    .map((d) => ({
      department: d.department,
      attempts: d.attempts,
      passed: d.passed,
      pass_rate_percent: d.attempts === 0 ? "" : Math.round((d.passed / d.attempts) * 1000) / 10,
      overdue_periods: d.overdue,
    }));
}
