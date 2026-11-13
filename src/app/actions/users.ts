"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { createUser, importUsers, setActive, updateUser } from "../../lib/admin/users";
import { setUserPhoto } from "../../lib/profile/service";
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

// Admins set a user's photo from the user's page (JPG or PNG, up to 5 MB).
export async function uploadUserPhotoAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const to = `/admin/users/${id}`;
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) back("Choose a photo", "error", to);
  const result = await setUserPhoto(actor, id, {
    filename: (file as File).name,
    mime: (file as File).type,
    sizeBytes: (file as File).size,
    bytes: Buffer.from(await (file as File).arrayBuffer()),
  });
  if (!result.ok) back(result.error, "error", to);
  revalidatePath("/admin/users");
  back("Photo saved", "notice", to);
}
