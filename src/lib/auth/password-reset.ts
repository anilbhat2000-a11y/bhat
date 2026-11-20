import { randomBytes } from "node:crypto";
import { prisma } from "../db/client";
import { hashPassword } from "./password";
import { hashToken } from "./session";
import { requireRole } from "./guards";
import type { SessionUser } from "./session";
import { recordAudit } from "../audit/record";
import type { Mailer } from "../notifications/mailer";
import { PORTAL_NAME } from "../brand";

// "Forgot password". Two ways, chosen by whether the company mail server is configured:
//  - email (SMTP_URL set): the person gets a one-time link, valid for an hour;
//  - no email: the request goes to the LMS administrators, who set a temporary password
//    on the person's page (Admin → Users) and tell them.
// The answer on screen is the same whether or not the email belongs to an account, so the
// form cannot be used to find out who works here.

export const LINK_MINUTES = 60;
export const MIN_PASSWORD = 8;
const PER_EMAIL_PER_HOUR = 3;
const PER_IP_PER_15_MIN = 10;

export type ResetMode = "EMAIL" | "ADMIN";
export const resetMode = (env: Record<string, string | undefined> = process.env): ResetMode => (env.SMTP_URL?.trim() ? "EMAIL" : "ADMIN");

export const REQUEST_MESSAGE: Record<ResetMode, string> = {
  EMAIL: `If an active account uses that email address, we have sent it a link to choose a new password. The link works once, for ${LINK_MINUTES} minutes. Check your junk folder if it does not arrive within a few minutes.`,
  ADMIN: "If an active account uses that email address, your request has been sent to the LMS administrator. They will set a temporary password and tell you, usually within one working day.",
};

export function passwordProblem(pw: string, confirm?: string): string | null {
  if (pw.length < MIN_PASSWORD) return `The new password must be at least ${MIN_PASSWORD} characters`;
  if (pw.length > 200) return "The new password is too long";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Use at least one letter and one number";
  if (confirm !== undefined && pw !== confirm) return "The two passwords do not match";
  return null;
}

// Handles a "forgot password" form. Always resolves to the same message for the mode, apart
// from the rate limit. The mailer is passed in (tests use a fake one).
export async function requestPasswordReset(
  input: { email: string; ip: string | null; baseUrl: string },
  opts: { mode?: ResetMode; mailer?: Mailer | null; now?: Date } = {},
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const mode = opts.mode ?? resetMode();
  const now = opts.now ?? new Date();
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter your work email address" };

  if (input.ip) {
    const since = new Date(now.getTime() - 15 * 60_000);
    const fromIp = await prisma.loginFailure.count({ where: { key: `reset-ip:${input.ip}`, at: { gt: since } } });
    if (fromIp >= PER_IP_PER_15_MIN) return { ok: false, error: "Too many requests from this computer. Wait 15 minutes and try again." };
    await prisma.loginFailure.create({ data: { key: `reset-ip:${input.ip}`, at: now } });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, active: true } });
  if (!user || !user.active) return { ok: true, message: REQUEST_MESSAGE[mode] };

  const recent = await prisma.passwordReset.count({ where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - 3600_000) } } });
  if (recent >= PER_EMAIL_PER_HOUR) return { ok: true, message: REQUEST_MESSAGE[mode] };

  if (mode === "ADMIN") {
    const open = await prisma.passwordReset.findFirst({ where: { userId: user.id, kind: "ADMIN", status: "OPEN" } });
    if (!open) {
      await prisma.$transaction(async (tx) => {
        const r = await tx.passwordReset.create({ data: { userId: user.id, kind: "ADMIN", requestIp: input.ip, createdAt: now } });
        await recordAudit(tx, { actorId: user.id, action: "user.password.reset-request", entityType: "PasswordReset", entityId: r.id, after: { kind: "ADMIN" } });
      });
    }
    return { ok: true, message: REQUEST_MESSAGE.ADMIN };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + LINK_MINUTES * 60_000);
  await prisma.$transaction(async (tx) => {
    // Only the newest link works.
    await tx.passwordReset.updateMany({ where: { userId: user.id, kind: "EMAIL", status: "OPEN" }, data: { status: "CANCELLED", closedAt: now } });
    const r = await tx.passwordReset.create({ data: { userId: user.id, kind: "EMAIL", tokenHash: hashToken(token), requestIp: input.ip, createdAt: now, expiresAt } });
    await recordAudit(tx, { actorId: user.id, action: "user.password.reset-request", entityType: "PasswordReset", entityId: r.id, after: { kind: "EMAIL" } });
  });
  const link = `${input.baseUrl.replace(/\/+$/, "")}/reset-password?token=${token}`;
  try {
    await opts.mailer?.send(user.email, `${PORTAL_NAME}: reset your password`, [
      `Hello ${user.name},`,
      "",
      `Someone (we hope you) asked to reset the password for your ${PORTAL_NAME} account.`,
      "",
      `To choose a new password, open this link within ${LINK_MINUTES} minutes:`,
      link,
      "",
      "The link works only once. If you did not ask for this, ignore this email: your password stays the same.",
    ].join("\n"));
  } catch (e) {
    console.error("password reset email failed", (e as Error).message);
  }
  return { ok: true, message: REQUEST_MESSAGE.EMAIL };
}

// Checks a link before the form is shown.
export async function checkResetToken(token: string, now: Date = new Date()): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  if (!token || token.length > 200) return { ok: false, error: "This link is not valid." };
  const r = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { name: true, active: true } } } });
  if (!r || r.kind !== "EMAIL" || !r.user.active) return { ok: false, error: "This link is not valid." };
  if (r.status !== "OPEN") return { ok: false, error: "This link has already been used or replaced by a newer one." };
  if (!r.expiresAt || r.expiresAt <= now) return { ok: false, error: `This link has expired (links work for ${LINK_MINUTES} minutes).` };
  return { ok: true, name: r.user.name };
}

// Sets the new password from a valid link. Ends every session of the account.
export async function resetPasswordWithToken(token: string, password: string, confirm: string, now: Date = new Date()): Promise<{ ok: true } | { ok: false; error: string }> {
  const valid = await checkResetToken(token, now);
  if (!valid.ok) return valid;
  const problem = passwordProblem(password, confirm);
  if (problem) return { ok: false, error: problem };
  const hash = await hashPassword(password);
  const r = await prisma.passwordReset.findUniqueOrThrow({ where: { tokenHash: hashToken(token) }, include: { user: { select: { id: true, email: true } } } });
  const claimed = await prisma.$transaction(async (tx) => {
    const used = await tx.passwordReset.updateMany({ where: { id: r.id, status: "OPEN" }, data: { status: "USED", closedAt: now } });
    if (used.count === 0) return false;
    await tx.user.update({ where: { id: r.userId }, data: { passwordHash: hash } });
    await tx.session.deleteMany({ where: { userId: r.userId } });
    await tx.passwordReset.updateMany({ where: { userId: r.userId, status: "OPEN" }, data: { status: "DONE", closedAt: now } });
    await tx.loginFailure.deleteMany({ where: { key: `email:${r.user.email}` } });
    await recordAudit(tx, { actorId: r.userId, action: "user.password.reset-by-link", entityType: "User", entityId: r.userId });
    return true;
  });
  return claimed ? { ok: true } : { ok: false, error: "This link has already been used." };
}

// --- Admin side -------------------------------------------------------------------------

export async function openResetRequests(actor: SessionUser) {
  requireRole(actor, ["ADMIN"]);
  return prisma.passwordReset.findMany({
    where: { kind: "ADMIN", status: "OPEN" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, department: true, active: true } } },
  });
}

export async function closeResetRequest(actor: SessionUser, id: string, status: "DONE" | "CANCELLED"): Promise<{ ok: true } | { ok: false; error: string }> {
  requireRole(actor, ["ADMIN"]);
  const r = await prisma.passwordReset.findUnique({ where: { id } });
  if (!r || r.status !== "OPEN") return { ok: false, error: "This request is already closed" };
  await prisma.$transaction(async (tx) => {
    await tx.passwordReset.update({ where: { id }, data: { status, closedAt: new Date() } });
    await recordAudit(tx, { actorId: actor.id, action: status === "DONE" ? "user.password.reset-request.done" : "user.password.reset-request.dismiss", entityType: "PasswordReset", entityId: id });
  });
  return { ok: true };
}
