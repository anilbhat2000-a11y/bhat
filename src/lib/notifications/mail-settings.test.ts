import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:net";
import { prisma } from "../db/client";
import type { SessionUser } from "../auth/session";
import { encryptSecret, decryptSecret } from "../settings/secret";
import { checkMailInput, explainSmtpError, getMailSettings, getMailer, mailSource, saveMailSettings, sendTestEmail } from "./mail-settings";

// A tiny SMTP server that accepts one message and keeps it.
function fakeSmtp(): Promise<{ server: Server; port: number; messages: string[] }> {
  const messages: string[] = [];
  const server = createServer((sock) => {
    let data = false; let buf = "";
    sock.write("220 test ESMTP\r\n");
    sock.on("data", (chunk) => {
      buf += chunk.toString();
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (data) {
          if (line === ".") { data = false; sock.write("250 OK queued\r\n"); } else messages[messages.length - 1] += `${line}\n`;
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO" || cmd === "HELO") sock.write("250-test\r\n250 OK\r\n");
        else if (cmd === "MAIL" || cmd === "RCPT" || cmd === "RSET" || cmd === "NOOP") sock.write("250 OK\r\n");
        else if (cmd === "DATA") { data = true; messages.push(""); sock.write("354 go\r\n"); }
        else if (cmd === "QUIT") { sock.write("221 bye\r\n"); sock.end(); }
        else sock.write("502 no\r\n");
      }
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: (server.address() as { port: number }).port, messages })));
}

const tag = `mail-${Date.now()}`;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: `${tag}@example.test`, department: null };
let smtp: Awaited<ReturnType<typeof fakeSmtp>>;
let saved: unknown = null;

beforeAll(async () => {
  process.env.CRON_SECRET ??= "test-cron-secret";
  admin.id = (await prisma.user.create({ data: { name: "A", email: admin.email, passwordHash: "x", role: "ADMIN" } })).id;
  saved = (await prisma.appSetting.findUnique({ where: { key: "mail" } }))?.value ?? null;
  smtp = await fakeSmtp();
});
afterAll(async () => {
  if (saved) await prisma.appSetting.update({ where: { key: "mail" }, data: { value: saved as object } });
  else await prisma.appSetting.deleteMany({ where: { key: "mail" } });
  await prisma.auditEvent.deleteMany({ where: { actorId: admin.id } });
  await prisma.user.delete({ where: { id: admin.id } });
  smtp.server.close();
  await prisma.$disconnect();
});

describe("mail settings", () => {
  it("encrypts secrets so they can only be read with the same key", () => {
    const env = { CRON_SECRET: "one" };
    const enc = encryptSecret("p@ss", env);
    expect(enc).not.toContain("p@ss");
    expect(decryptSecret(enc, env)).toBe("p@ss");
    expect(decryptSecret(enc, { CRON_SECRET: "two" })).toBeNull();
  });

  it("checks input and explains common errors", () => {
    const ok = { host: "smtp.office365.com", port: 587, security: "STARTTLS", username: "", fromAddress: "lms@x.in", fromName: "LMS" };
    expect(checkMailInput(ok)).toBeNull();
    expect(checkMailInput({ ...ok, host: "smtp office" })).toMatch(/server name/);
    expect(checkMailInput({ ...ok, port: 70000 })).toMatch(/port/);
    expect(checkMailInput({ ...ok, fromAddress: "nope" })).toMatch(/sender/);
    expect(explainSmtpError(Object.assign(new Error("Invalid login"), { code: "EAUTH" }))).toMatch(/user name or password/);
    expect(explainSmtpError(new Error("getaddrinfo ENOTFOUND smtp.x"))).toMatch(/could not be found/);
  });

  it("saves settings with an encrypted password, sends a test email, and switches email on", async () => {
    await prisma.appSetting.deleteMany({ where: { key: "mail" } });
    expect(await mailSource({})).toBe("NONE");
    expect(await mailSource({ SMTP_URL: "smtp://x" })).toBe("ENV");
    const base = { host: "127.0.0.1", port: smtp.port, security: "NONE" as const, username: "", fromAddress: "lms@example.test", fromName: "3C LMS" };
    expect(await saveMailSettings(admin, { ...base, enabled: false, password: "Secret-1" })).toEqual({ ok: true });
    const row = await prisma.appSetting.findUniqueOrThrow({ where: { key: "mail" } });
    expect(JSON.stringify(row.value)).not.toContain("Secret-1");
    const s = await getMailSettings();
    expect(s).toMatchObject({ enabled: false, hasPassword: true, host: "127.0.0.1" });
    expect("password" in s).toBe(false);
    // Saving with an empty password keeps the old one.
    await saveMailSettings(admin, { ...base, enabled: true, password: "" });
    expect((await getMailSettings()).hasPassword).toBe(true);
    expect(await mailSource({})).toBe("SETTINGS");

    expect(await sendTestEmail(admin, "someone@example.test")).toEqual({ ok: true });
    expect(smtp.messages.at(-1)).toContain("test email");
    expect(smtp.messages.at(-1)).toContain("From: 3C LMS <lms@example.test>");
    const mailer = await getMailer();
    await mailer!.send("x@example.test", "Hello", "Body text");
    expect(smtp.messages.at(-1)).toContain("Body text");
  });

  it("reports a server that is not there", async () => {
    await saveMailSettings(admin, { host: "127.0.0.1", port: 1, security: "NONE", username: "", password: "", fromAddress: "lms@example.test", fromName: "", enabled: true });
    const r = await sendTestEmail(admin, "someone@example.test");
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("refused the connection") });
  });
});
