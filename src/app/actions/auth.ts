"use server";

import { cookies, headers } from "next/headers";
import { clearLoginFailures, isLoginBlocked, loginKeys, recordLoginFailure } from "../../lib/auth/rate-limit";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/db/client";
import { verifyPassword } from "../../lib/auth/password";
import { createSession, hashToken } from "../../lib/auth/session";
import { HOME } from "../../lib/auth/portal";
import { SESSION_COOKIE } from "../../lib/auth/current-user";
import { cookieSecure } from "../../lib/auth/cookie";

export type LoginState = { error?: string };

// Same message for an unknown email, a wrong password, and a deactivated account.
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const keys = loginKeys(email, ip);
  if (await isLoginBlocked(keys)) {
    return { error: "Too many failed sign-in attempts. Wait 15 minutes and try again, or ask an admin to reset your password." };
  }

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const ok = user !== null && user.active && (await verifyPassword(password, user.passwordHash));
  if (!user || !ok) {
    await recordLoginFailure(keys);
    return { error: "Invalid email or password" };
  }
  await clearLoginFailures(email);

  const { token, expiresAt } = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(process.env),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  redirect(HOME[user.role]);
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
