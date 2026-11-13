"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/db/client";
import { verifyPassword } from "../../lib/auth/password";
import { createSession, hashToken } from "../../lib/auth/session";
import { HOME } from "../../lib/auth/portal";
import { SESSION_COOKIE } from "../../lib/auth/current-user";

export type LoginState = { error?: string };

// Same message for an unknown email, a wrong password, and a deactivated account.
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const ok = user !== null && user.active && (await verifyPassword(password, user.passwordHash));
  if (!user || !ok) return { error: "Invalid email or password" };

  const { token, expiresAt } = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
