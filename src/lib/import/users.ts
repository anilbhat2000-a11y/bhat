import type { Role } from "../../generated/prisma/client";

export type UserRow = { name: string; email: string; role: string; department: string; managerEmail: string; password: string };
export type ParsedUser = {
  name: string;
  email: string;
  role: Role;
  department: string;
  managerEmail: string | null;
  password: string;
};
export type RowError = { row: number; reason: string };

const ROLES: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// knownEmails are users already in the database, so a manager need not be in the file.
export function parseUserRows(
  rows: UserRow[],
  knownEmails: Set<string>,
): { ok: true; users: ParsedUser[] } | { ok: false; errors: RowError[] } {
  const errors: RowError[] = [];
  const users: ParsedUser[] = [];
  const emailsInFile = new Set(rows.map((r) => r.email.trim().toLowerCase()));
  const seen = new Set<string>();

  rows.forEach((raw, index) => {
    const row = index + 1;
    const fail = (reason: string) => errors.push({ row, reason });

    const name = raw.name.trim();
    if (!name) return fail("name is required");
    const email = raw.email.trim().toLowerCase();
    if (!EMAIL.test(email)) return fail("email is not valid");
    if (seen.has(email)) return fail("email appears more than once in this file");
    seen.add(email);

    const role = raw.role.trim().toUpperCase() as Role;
    if (!ROLES.includes(role)) return fail(`role must be one of ${ROLES.join(", ")}`);

    const managerEmail = raw.managerEmail.trim().toLowerCase() || null;
    if (managerEmail && !emailsInFile.has(managerEmail) && !knownEmails.has(managerEmail)) {
      return fail("manager is not in this file or the system");
    }

    if (raw.password.length < 8) return fail("initial password must be at least 8 characters");

    users.push({ name, email, role, department: raw.department.trim(), managerEmail, password: raw.password });
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, users };
}
