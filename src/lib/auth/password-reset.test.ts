import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/client";
import type { SessionUser } from "./session";
import { verifyPassword } from "./password";
import { createSession } from "./session";
import { setUserPassword } from "../admin/users";
import {
  requestPasswordReset, checkResetToken, resetPasswordWithToken, openResetRequests, closeResetRequest, passwordProblem, REQUEST_MESSAGE, resetMode,
} from "./password-reset";

const tag = `pwr-${Date.now()}`;
const email = `${tag}@example.test`;
let userId: string;
const admin: SessionUser = { id: "", role: "ADMIN", active: true, name: "A", email: "", department: null };
const sent: { to: string; body: string }[] = [];
const mailer = { send: async (to: string, _s: string, body: string) => { sent.push({ to, body }); } };
const tokenFrom = (body: string) => /token=([A-Za-z0-9_-]+)/.exec(body)?.[1] ?? "";

beforeAll(async () => {
  userId = (await prisma.user.create({ data: { name: "Pat", email, passwordHash: "x", role: "EMPLOYEE" } })).id;
  admin.id = (await prisma.user.create({ data: { name: "Adm", email: `${tag}-a@example.test`, passwordHash: "x", role: "ADMIN" } })).id;
});
afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { actorId: { in: [userId, admin.id] } } });
  await prisma.loginFailure.deleteMany({ where: { key: { contains: tag } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.$disconnect();
});

describe("forgot password", () => {
  it("chooses email or admin mode and checks passwords", () => {
    expect(resetMode({ SMTP_URL: "smtp://x" })).toBe("EMAIL");
    expect(resetMode({ SMTP_URL: "" })).toBe("ADMIN");
    expect(passwordProblem("short1")).toMatch(/at least 8/);
    expect(passwordProblem("lettersonly")).toMatch(/letter and one number/);
    expect(passwordProblem("Good-pass-1", "Other-pass-1")).toMatch(/do not match/);
    expect(passwordProblem("Good-pass-1", "Good-pass-1")).toBeNull();
  });

  it("emails a one-time link that sets a new password, ends sessions, and cannot be reused", async () => {
    const base = { ip: `${tag}-ip1`, baseUrl: "https://lms.example/" };
    const unknown = await requestPasswordReset({ ...base, email: `nobody-${tag}@example.test` }, { mode: "EMAIL", mailer });
    const known = await requestPasswordReset({ ...base, email: email.toUpperCase() }, { mode: "EMAIL", mailer });
    expect(unknown).toEqual({ ok: true, message: REQUEST_MESSAGE.EMAIL });
    expect(known).toEqual(unknown); // same answer: no way to tell who has an account
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toContain("https://lms.example/reset-password?token=");
    const token = tokenFrom(sent[0].body);
    expect(await checkResetToken(token)).toMatchObject({ ok: true, name: "Pat" });
    await createSession(userId);
    expect(await resetPasswordWithToken(token, "short", "short")).toMatchObject({ ok: false });
    expect(await resetPasswordWithToken(token, "New-pass-2026", "New-pass-2026")).toEqual({ ok: true });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword("New-pass-2026", u.passwordHash)).toBe(true);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);
    expect(await resetPasswordWithToken(token, "Other-pass-2026", "Other-pass-2026")).toMatchObject({ ok: false });
    // Only the stored hash, never the token, is in the database.
    expect(await prisma.passwordReset.count({ where: { tokenHash: token } })).toBe(0);
  });

  it("expires links and keeps only the newest one", async () => {
    sent.length = 0;
    const t0 = new Date();
    await requestPasswordReset({ email, ip: `${tag}-ip2`, baseUrl: "https://x" }, { mode: "EMAIL", mailer, now: t0 });
    await requestPasswordReset({ email, ip: `${tag}-ip2`, baseUrl: "https://x" }, { mode: "EMAIL", mailer, now: t0 });
    const [first, second] = sent.map((s) => tokenFrom(s.body));
    expect(await checkResetToken(first)).toMatchObject({ ok: false, error: expect.stringContaining("already been used or replaced") });
    expect(await checkResetToken(second, new Date(t0.getTime() + 61 * 60_000))).toMatchObject({ ok: false, error: expect.stringContaining("expired") });
    expect(await checkResetToken("garbage")).toMatchObject({ ok: false });
  });

  it("without email, sends the request to admins; setting a password closes it", async () => {
    await prisma.passwordReset.deleteMany({ where: { userId } });
    const r = await requestPasswordReset({ email, ip: `${tag}-ip3`, baseUrl: "https://x" }, { mode: "ADMIN", mailer: null });
    expect(r).toEqual({ ok: true, message: REQUEST_MESSAGE.ADMIN });
    await requestPasswordReset({ email, ip: `${tag}-ip3`, baseUrl: "https://x" }, { mode: "ADMIN", mailer: null });
    const open = (await openResetRequests(admin)).filter((x) => x.userId === userId);
    expect(open).toHaveLength(1); // a second request does not duplicate
    await setUserPassword(admin, userId, "Temp-pass-77");
    expect((await openResetRequests(admin)).filter((x) => x.userId === userId)).toHaveLength(0);
    // Dismissing works too.
    await requestPasswordReset({ email, ip: `${tag}-ip3`, baseUrl: "https://x" }, { mode: "ADMIN", mailer: null });
    const again = (await openResetRequests(admin)).find((x) => x.userId === userId)!;
    expect(await closeResetRequest(admin, again.id, "CANCELLED")).toEqual({ ok: true });
    expect(await closeResetRequest(admin, again.id, "CANCELLED")).toMatchObject({ ok: false });
  });

  it("limits requests per computer", async () => {
    const ip = `${tag}-ip4`;
    for (let i = 0; i < 10; i++) await requestPasswordReset({ email: `x${i}-${tag}@example.test`, ip, baseUrl: "https://x" }, { mode: "ADMIN" });
    expect(await requestPasswordReset({ email, ip, baseUrl: "https://x" }, { mode: "ADMIN" })).toMatchObject({ ok: false, error: expect.stringContaining("Too many") });
  });
});
