import type { Level } from "../../generated/prisma/client";

const LEVELS: Level[] = ["BASIC", "INTERMEDIATE", "ADVANCED"];

// Certifications per subject: how many of each level, and how many are still active.
export function certsBySubject(
  certs: { subject: string; level: Level; expiresAt: Date }[],
  now: Date,
): { subject: string; byLevel: Record<Level, number>; active: number; expired: number }[] {
  const bySubject = new Map<string, { subject: string; byLevel: Record<Level, number>; active: number; expired: number }>();
  for (const c of certs) {
    const row = bySubject.get(c.subject) ?? {
      subject: c.subject,
      byLevel: { BASIC: 0, INTERMEDIATE: 0, ADVANCED: 0 },
      active: 0,
      expired: 0,
    };
    row.byLevel[c.level] += 1;
    if (c.expiresAt.getTime() > now.getTime()) row.active += 1;
    else row.expired += 1;
    bySubject.set(c.subject, row);
  }
  return [...bySubject.values()].sort((a, b) => a.subject.localeCompare(b.subject));
}

// Share of attempts that passed, per department, as a percentage to one decimal place.
export function passRateByDepartment(attempts: { department: string; passed: boolean }[]): { department: string; rate: number }[] {
  const tally = new Map<string, { total: number; passed: number }>();
  for (const a of attempts) {
    const t = tally.get(a.department) ?? { total: 0, passed: 0 };
    t.total += 1;
    if (a.passed) t.passed += 1;
    tally.set(a.department, t);
  }
  return [...tally.entries()]
    .map(([department, t]) => ({ department, rate: Math.round((t.passed / t.total) * 1000) / 10 }))
    .sort((a, b) => a.department.localeCompare(b.department));
}

// RFC 4180: CRLF line endings, fields with commas, quotes, or line breaks are quoted.
// Pass `columns` so an empty report still has its header row.
export function toCsv(rows: Record<string, unknown>[], columns?: readonly string[]): string {
  const headers = columns ? [...columns] : rows.length > 0 ? Object.keys(rows[0]) : [];
  if (headers.length === 0) return "";
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\r\n") + "\r\n";
}

// One row per person, subject and level: the most recent certificate, so a weekly pass does
// not count as many certificates.
export function latestPerPerson<T extends { userId: string; subject: string; level: Level; issuedAt: Date }>(certs: T[]): T[] {
  const latest = new Map<string, T>();
  for (const c of certs) {
    const key = `${c.userId}|${c.subject}|${c.level}`;
    const current = latest.get(key);
    if (!current || c.issuedAt.getTime() > current.issuedAt.getTime()) latest.set(key, c);
  }
  return [...latest.values()];
}
