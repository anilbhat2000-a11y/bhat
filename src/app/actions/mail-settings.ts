"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { saveMailSettings, sendTestEmail, type Security } from "../../lib/notifications/mail-settings";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const to = (kind: "notice" | "error", msg: string): never => redirect(`/admin/settings/email?${kind}=${encodeURIComponent(msg)}`);

export async function saveMailSettingsAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const security = (["STARTTLS", "SSL", "NONE"].includes(text(fd, "security")) ? text(fd, "security") : "STARTTLS") as Security;
  const r = await saveMailSettings(actor, {
    enabled: fd.get("enabled") === "on",
    host: text(fd, "host"), port: Number(text(fd, "port")), security,
    username: text(fd, "username"), password: text(fd, "password"),
    fromAddress: text(fd, "fromAddress"), fromName: text(fd, "fromName"),
  });
  if (!r.ok) to("error", r.error);
  revalidatePath("/admin/settings/email");
  to("notice", fd.get("enabled") === "on" ? "Saved. Email is switched on. Send a test email to check it works." : "Saved. Email is switched off until you tick \"Send email from the portal\".");
}

export async function sendTestEmailAction(fd: FormData): Promise<void> {
  const actor = await requireSession();
  const r = await sendTestEmail(actor, text(fd, "to"));
  if (!r.ok) to("error", r.error);
  to("notice", `Test email sent to ${text(fd, "to").trim()}. Check the inbox (and the junk folder).`);
}
