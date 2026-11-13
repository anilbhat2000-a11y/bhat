"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { createInstructor } from "../../lib/learning/instructors";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

export async function createInstructorAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await createInstructor(actor, {
    name: text(formData, "name"),
    bio: text(formData, "bio"),
    location: text(formData, "location"),
    expertise: text(formData, "expertise"),
  });
  if (!result.ok) redirect(`/admin/instructors?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/instructors");
  redirect("/admin/instructors?notice=Instructor%20added");
}
