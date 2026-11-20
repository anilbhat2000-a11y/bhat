"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requestPasswordReset, resetMode, resetPasswordWithToken, closeResetRequest } from "../../lib/auth/password-reset";
import { smtpMailer } from "../../lib/notifications/mailer";
import { requireSession } from "../../lib/auth/current-user";

export type ForgotState = { message?: string; error?: string };
export type ResetState = { error?: string };

export async function forgotPasswordAction(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const base = process.env.PUBLIC_BASE_URL?.trim() || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "localhost"}`;
  const mode = resetMode();
  let mailer = null;
  try { mailer = mode === "EMAIL" ? smtpMailer() : null; } catch { mailer = null; }
  const r = await requestPasswordReset({ email: String(fd.get("email") ?? ""), ip, baseUrl: base }, { mode, mailer });
  return r.ok ? { message: r.message } : { error: r.error };
}

export async function resetPasswordAction(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const r = await resetPasswordWithToken(String(fd.get("token") ?? ""), String(fd.get("password") ?? ""), String(fd.get("confirm") ?? ""));
  if (!r.ok) return { error: r.error };
  redirect("/login?reset=1");
}

export async function closeResetRequestAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const status = fd.get("status") === "DONE" ? "DONE" : "CANCELLED";
  const r = await closeResetRequest(actor, String(fd.get("id") ?? ""), status);
  revalidatePath("/admin/users");
  redirect(`/admin/users?${r.ok ? "notice" : "error"}=${encodeURIComponent(r.ok ? "Request closed" : r.error)}`);
}
