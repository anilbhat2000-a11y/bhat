import nodemailer from "nodemailer";
import { prisma } from "../db/client";
import { requireRole } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { recordAudit } from "../audit/record";
import { decryptSecret, encryptSecret } from "../settings/secret";
import { smtpMailer, type Mailer } from "./mailer";
import type { Prisma } from "../../generated/prisma/client";
import { PORTAL_NAME } from "../brand";

// The mail server, set by an admin under Admin → Email settings. Saved settings take
// precedence; without them, SMTP_URL in .env is used (as before). With neither, the portal
// sends no email: reminders are skipped and "forgot password" requests go to admins.

export type Security = "STARTTLS" | "SSL" | "NONE";
export type MailSettings = {
  enabled: boolean;
  host: string;
  port: number;
  security: Security;
  username: string;
  hasPassword: boolean;
  fromAddress: string;
  fromName: string;
};
type Stored = Omit<MailSettings, "hasPassword"> & { password: string | null };
const KEY = "mail";

const DEFAULTS: MailSettings = { enabled: false, host: "", port: 587, security: "STARTTLS", username: "", hasPassword: false, fromAddress: "", fromName: PORTAL_NAME };

async function readStored(): Promise<Stored | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
  return row ? (row.value as unknown as Stored) : null;
}

export async function getMailSettings(): Promise<MailSettings> {
  const s = await readStored();
  if (!s) return DEFAULTS;
  return { enabled: s.enabled, host: s.host, port: s.port, security: s.security, username: s.username, hasPassword: !!s.password, fromAddress: s.fromAddress, fromName: s.fromName };
}

// Where email currently comes from.
export async function mailSource(env: Record<string, string | undefined> = process.env): Promise<"SETTINGS" | "ENV" | "NONE"> {
  const s = await readStored();
  if (s?.enabled && s.host) return "SETTINGS";
  return env.SMTP_URL?.trim() ? "ENV" : "NONE";
}

export async function mailEnabled(): Promise<boolean> {
  return (await mailSource()) !== "NONE";
}

function transportFor(s: Stored, passwordOverride?: string) {
  const pass = passwordOverride ?? (s.password ? decryptSecret(s.password) : null);
  return nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.security === "SSL",
    requireTLS: s.security === "STARTTLS",
    ignoreTLS: s.security === "NONE",
    auth: s.username ? { user: s.username, pass: pass ?? "" } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

const fromHeader = (s: Pick<Stored, "fromAddress" | "fromName">) => (s.fromName ? { name: s.fromName, address: s.fromAddress } : s.fromAddress);

function mailerFrom(s: Stored): Mailer {
  const transport = transportFor(s);
  return {
    async send(to, subject, body) {
      await transport.sendMail({ from: fromHeader(s), to, subject, text: body });
    },
  };
}

// The mailer to use now, or null when email is not set up.
export async function getMailer(): Promise<Mailer | null> {
  const s = await readStored();
  if (s?.enabled && s.host) return mailerFrom(s);
  if (process.env.SMTP_URL?.trim()) return smtpMailer();
  return null;
}

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const HOST = /^[A-Za-z0-9.-]+$/;

export function checkMailInput(i: { host: string; port: number; security: string; username: string; fromAddress: string; fromName: string }): string | null {
  if (!i.host.trim() || !HOST.test(i.host.trim())) return "Enter the mail server name, for example smtp.office365.com";
  if (!Number.isInteger(i.port) || i.port < 1 || i.port > 65535) return "The port must be a number from 1 to 65535 (usually 587 or 465)";
  if (!["STARTTLS", "SSL", "NONE"].includes(i.security)) return "Choose the security type";
  if (!EMAIL.test(i.fromAddress.trim())) return "Enter the sender email address, for example lms@yourcompany.com";
  if (i.fromName.length > 80) return "Keep the sender name under 80 characters";
  if (i.username.length > 200) return "The user name is too long";
  return null;
}

// Saves the settings. An empty password keeps the saved one.
export async function saveMailSettings(
  actor: SessionUser,
  input: { enabled: boolean; host: string; port: number; security: Security; username: string; password: string; fromAddress: string; fromName: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  requireRole(actor, ["ADMIN"]);
  const problem = checkMailInput(input);
  if (problem) return { ok: false, error: problem };
  const before = await readStored();
  const password = input.password ? encryptSecret(input.password) : before?.password ?? null;
  const value: Stored = {
    enabled: input.enabled, host: input.host.trim(), port: input.port, security: input.security, username: input.username.trim(),
    password, fromAddress: input.fromAddress.trim(), fromName: input.fromName.trim(),
  };
  await prisma.$transaction(async (tx) => {
    await tx.appSetting.upsert({ where: { key: KEY }, update: { value: value as unknown as Prisma.InputJsonValue, updatedById: actor.id }, create: { key: KEY, value: value as unknown as Prisma.InputJsonValue, updatedById: actor.id } });
    await recordAudit(tx, {
      actorId: actor.id, action: "settings.mail", entityType: "AppSetting", entityId: KEY,
      after: { enabled: value.enabled, host: value.host, port: value.port, security: value.security, username: value.username, fromAddress: value.fromAddress, passwordChanged: !!input.password },
    });
  });
  return { ok: true };
}

export async function clearMailPassword(actor: SessionUser): Promise<void> {
  requireRole(actor, ["ADMIN"]);
  const s = await readStored();
  if (!s) return;
  await prisma.appSetting.update({ where: { key: KEY }, data: { value: { ...s, password: null } as unknown as Prisma.InputJsonValue, updatedById: actor.id } });
}

// Sends a test message with the saved settings (even when switched off), and explains
// common failures in plain words.
export async function sendTestEmail(actor: SessionUser, to: string): Promise<{ ok: true } | { ok: false; error: string }> {
  requireRole(actor, ["ADMIN"]);
  if (!EMAIL.test(to.trim())) return { ok: false, error: "Enter the email address to send the test to" };
  const s = await readStored();
  if (!s?.host) return { ok: false, error: "Save the mail server settings first" };
  if (s.password && decryptSecret(s.password) === null) return { ok: false, error: "The saved password can no longer be read (the secret in .env changed). Enter the password again and save." };
  try {
    await mailerFrom(s).send(to.trim(), `${PORTAL_NAME}: test email`, `This is a test email from ${PORTAL_NAME}.\n\nIf you can read this, email is set up correctly. Reminders, announcements and password reset links will be sent from ${s.fromAddress}.`);
  } catch (e) {
    return { ok: false, error: explainSmtpError(e as Error & { code?: string; responseCode?: number }) };
  }
  await prisma.$transaction((tx) => recordAudit(tx, { actorId: actor.id, action: "settings.mail.test", entityType: "AppSetting", entityId: KEY, after: { to: to.trim() } }));
  return { ok: true };
}

export function explainSmtpError(e: Error & { code?: string; responseCode?: number }): string {
  const msg = e.message ?? "";
  if (e.code === "EAUTH" || e.responseCode === 535) return "The mail server refused the user name or password. Check them; Microsoft 365 and Gmail usually need an app password or SMTP AUTH turned on for this mailbox.";
  if (e.code === "ECONNREFUSED" || /ECONNREFUSED/.test(msg)) return "The server refused the connection on this port. Check the server name and port (587 for STARTTLS, 465 for SSL).";
  if (e.code === "ETIMEDOUT" || /ETIMEDOUT|timed? ?out/i.test(msg)) return "The mail server did not answer. Check the server name and port, and that the LMS server's firewall allows outgoing connections on that port.";
  if (e.code === "EDNS" || /ENOTFOUND|getaddrinfo/.test(msg)) return "The mail server name could not be found. Check the spelling, for example smtp.office365.com.";
  if (/certificate|self.signed|wrong version number|SSL routines/i.test(msg)) return "The secure connection failed. Try the other security option (STARTTLS on port 587, or SSL on port 465).";
  if (e.responseCode === 550 || e.responseCode === 553 || /sender|from address|not allowed to send/i.test(msg)) return "The server refused the sender address. Use an address that this mailbox is allowed to send as.";
  return `Sending failed: ${msg.slice(0, 300)}`;
}
