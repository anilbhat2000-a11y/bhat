"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { createUser, importUsers, setActive, updateUser } from "../../lib/admin/users";
import type { Role } from "../../generated/prisma/client";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

function back(message: string, kind: "error" | "notice", to = "/admin/users"): never {
  redirect(`${to}?${kind}=${encodeURIComponent(message)}`);
}

export async function createUserAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await createUser(actor, {
    name: text(formData, "name"),
    email: text(formData, "email"),
    role: text(formData, "role") as Role,
    department: text(formData, "department"),
    jobTitle: text(formData, "jobTitle"),
    managerId: text(formData, "managerId") || null,
    password: text(formData, "password"),
  });
  if (!result.ok) back(result.error, "error");
  revalidatePath("/admin/users");
  back("User created", "notice");
}

export async function importUsersAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await importUsers(actor, text(formData, "csv"));
  if (!result.ok) {
    const first = result.errors[0];
    back(`Row ${first.row}: ${first.reason}. Nothing was imported.`, "error");
  }
  revalidatePath("/admin/users");
  back(`Imported ${result.created} users`, "notice");
}

export async function setActiveAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const result = await setActive(actor, id, text(formData, "active") === "true");
  if (!result.ok) back(result.error, "error", `/admin/users/${id}`);
  revalidatePath("/admin/users");
  back("Status updated", "notice", `/admin/users/${id}`);
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const result = await updateUser(actor, id, {
    name: text(formData, "name"),
    role: text(formData, "role") as Role,
    department: text(formData, "department"),
    jobTitle: text(formData, "jobTitle"),
    managerId: text(formData, "managerId") || null,
  });
  if (!result.ok) back(result.error, "error", `/admin/users/${id}`);
  revalidatePath("/admin/users");
  back("Saved", "notice", `/admin/users/${id}`);
}
