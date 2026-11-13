import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import { hashPassword } from "../auth/password";
import { reportingLineIds } from "../auth/scope";
import type { SessionUser } from "../auth/session";
import { parseCsvRows } from "../import/csv";
import { parseUserRows, type UserRow } from "../import/users";
import type { Category, Role } from "../../generated/prisma/client";
import { recordAudit } from "../audit/record";

export type Result = { ok: true; id?: string } | { ok: false; error: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UserInput = {
  name: string;
  email: string;
  role: Role;
  department?: string | null;
  jobTitle?: string | null;
  managerId?: string | null;
  password: string;
};

// Every function here checks the actor itself, so a caller cannot skip the check.
function asAdmin(actor: SessionUser): void {
  requireRole(actor, ["ADMIN"]);
}

export async function createUser(actor: SessionUser, input: UserInput): Promise<Result> {
  asAdmin(actor);
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };
  if (input.password.length < 8) return { ok: false, error: "Initial password must be at least 8 characters" };
  if (await prisma.user.findUnique({ where: { email } })) {
    return { ok: false, error: "A user with this email already exists" };
  }
  if (input.managerId && !(await prisma.user.findUnique({ where: { id: input.managerId } }))) {
    return { ok: false, error: "Manager not found" };
  }
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      role: input.role,
      department: input.department?.trim() || null,
      jobTitle: input.jobTitle?.trim() || null,
      managerId: input.managerId || null,
      passwordHash: await hashPassword(input.password),
    },
  });
  await recordAudit(prisma, { actorId: actor.id, action: "user.create", entityType: "User", entityId: user.id, after: { email, role: input.role } });
  return { ok: true, id: user.id };
}

export async function updateUser(
  actor: SessionUser,
  id: string,
  patch: Partial<Omit<UserInput, "password" | "email">> & { email?: string },
): Promise<Result> {
  asAdmin(actor);
  if (patch.managerId) {
    if (patch.managerId === id) return { ok: false, error: "A user cannot be their own manager" };
    const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
    // A manager may not sit under the user in the reporting tree: that would form a loop.
    if (reportingLineIds(id, all).has(patch.managerId)) {
      return { ok: false, error: "That manager reports to this user, which would create a loop" };
    }
  }
  await prisma.user.update({
    where: { id },
    data: {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.role !== undefined && { role: patch.role }),
      ...(patch.department !== undefined && { department: patch.department?.trim() || null }),
      ...(patch.jobTitle !== undefined && { jobTitle: patch.jobTitle?.trim() || null }),
      ...(patch.managerId !== undefined && { managerId: patch.managerId || null }),
    },
  });
  return { ok: true, id };
}

// Deactivating removes every session in the same transaction, so the user is signed out
// on their next request.
export async function setActive(actor: SessionUser, id: string, active: boolean): Promise<Result> {
  asAdmin(actor);
  if (!active && actor.id === id) return { ok: false, error: "You cannot deactivate your own account" };
  const before = await prisma.user.findUnique({ where: { id }, select: { active: true } });
  if (!before) return { ok: false, error: "User not found" };
  // The change, the sign-out, and the audit row succeed or fail together.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { active } });
    if (!active) await tx.session.deleteMany({ where: { userId: id } });
    await recordAudit(tx, {
      actorId: actor.id,
      action: active ? "user.activate" : "user.deactivate",
      entityType: "User",
      entityId: id,
      before: { active: before.active },
      after: { active },
    });
  });
  return { ok: true, id };
}

export function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createSubject(
  actor: SessionUser,
  input: { name: string; category: Category; certificationValidityMonths: number },
): Promise<Result> {
  asAdmin(actor);
  if (!input.name.trim()) return { ok: false, error: "Name is required" };
  if (!Number.isInteger(input.certificationValidityMonths) || input.certificationValidityMonths < 1) {
    return { ok: false, error: "Validity must be a whole number of months" };
  }
  const subject = await prisma.subject.create({
    data: {
      name: input.name.trim(),
      slug: slugify(input.name),
      category: input.category,
      certificationValidityMonths: input.certificationValidityMonths,
    },
  });
  return { ok: true, id: subject.id };
}

export async function updateSubject(
  actor: SessionUser,
  id: string,
  patch: { name?: string; category?: Category; certificationValidityMonths?: number },
): Promise<Result> {
  asAdmin(actor);
  await prisma.subject.update({
    where: { id },
    data: {
      ...(patch.name !== undefined && { name: patch.name.trim(), slug: slugify(patch.name) }),
      ...(patch.category !== undefined && { category: patch.category }),
      ...(patch.certificationValidityMonths !== undefined && {
        certificationValidityMonths: patch.certificationValidityMonths,
      }),
    },
  });
  return { ok: true, id };
}

// All-or-nothing: any invalid row, or an email already in use, saves nothing.
export async function importUsers(
  actor: SessionUser,
  csvText: string,
): Promise<{ ok: true; created: number } | { ok: false; errors: { row: number; reason: string }[] }> {
  asAdmin(actor);
  const raw = parseCsvRows(csvText).map(
    (r): UserRow => ({
      name: r.name ?? "",
      email: r.email ?? "",
      role: r.role ?? "",
      department: r.department ?? "",
      managerEmail: r.managerEmail ?? "",
      password: r.password ?? "",
    }),
  );
  const known = new Set((await prisma.user.findMany({ select: { email: true } })).map((u) => u.email));
  const parsed = parseUserRows(raw, known);
  if (!parsed.ok) return parsed;

  const errors = parsed.users.flatMap((u, i) =>
    known.has(u.email) ? [{ row: i + 1, reason: "email already exists" }] : [],
  );
  if (errors.length > 0) return { ok: false, errors };

  // Hash first: bcrypt is slow, and a transaction left open that long times out.
  const hashes = await Promise.all(parsed.users.map((u) => hashPassword(u.password)));
  const created = await prisma.$transaction(async (tx) => {
    // Managers may be created in the same file, so insert without manager links first.
    for (const [i, u] of parsed.users.entries()) {
      await tx.user.create({
        data: {
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department || null,
          passwordHash: hashes[i],
        },
      });
    }
    for (const u of parsed.users.filter((x) => x.managerEmail)) {
      const manager = await tx.user.findUnique({ where: { email: u.managerEmail as string } });
      await tx.user.update({ where: { email: u.email }, data: { managerId: manager?.id ?? null } });
    }
    return parsed.users.length;
  });
  return { ok: true, created };
}

