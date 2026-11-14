"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import {
  addCourseToPath, assignPath, copyTemplate, createPath, deletePath, moveCourseInPath, parseGoals,
  removeCourseFromPath, unassignPath, updatePath,
} from "../../lib/learning/paths";
import type { AssignmentTarget } from "../../generated/prisma/client";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
function back(to: string, kind: "error" | "notice", message: string): never {
  const [path, hash] = to.split("#");
  redirect(`${path}?${kind}=${encodeURIComponent(message)}${hash ? `#${hash}` : ""}`);
}
const safeReturn = (fd: FormData, fallback: string) => {
  const to = text(fd, "returnTo");
  return /^\/(admin|manager)\/[\w\-/#]*$/.test(to) ? to : fallback;
};
function dueDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T23:59:59+05:30`);
}

export async function createPathAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await createPath(actor, {
    title: text(formData, "title"),
    description: text(formData, "description"),
    goals: parseGoals(formData.getAll("goal").map(String)),
    courseIds: formData.getAll("courseId").map(String),
  });
  if (!result.ok) back(`/admin/paths/new`, "error", result.error);
  revalidatePath("/admin/paths");
  back(`/admin/paths/${result.id}`, "notice", "Learning path created. Now assign it to people.");
}

export async function copyTemplateAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await copyTemplate(actor, text(formData, "templateId"));
  if (!result.ok) back("/admin/paths", "error", result.error);
  revalidatePath("/admin/paths");
  back(`/admin/paths/${result.id}`, "notice", "Your copy of the ready-made path is ready. Change it if you like, then assign it.");
}

export async function updatePathAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const result = await updatePath(actor, id, { title: text(formData, "title"), description: text(formData, "description"), goals: parseGoals(formData.getAll("goal").map(String)) });
  if (!result.ok) back(`/admin/paths/${id}`, "error", result.error);
  revalidatePath(`/admin/paths/${id}`);
  back(`/admin/paths/${id}`, "notice", "Learning path saved");
}

export async function pathCourseAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const courseId = text(formData, "courseId");
  const op = text(formData, "op");
  const result = op === "add" ? await addCourseToPath(actor, id, courseId)
    : op === "remove" ? await removeCourseFromPath(actor, id, courseId)
      : await moveCourseInPath(actor, id, courseId, op === "up" ? "up" : "down");
  if (!result.ok) back(`/admin/paths/${id}#courses`, "error", result.error);
  revalidatePath(`/admin/paths/${id}`);
  back(`/admin/paths/${id}#courses`, "notice", op === "add" ? "Course added" : op === "remove" ? "Course removed" : "Order changed");
}

export async function deletePathAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const id = text(formData, "id");
  const result = await deletePath(actor, id);
  if (!result.ok) back(`/admin/paths/${id}`, "error", result.error);
  revalidatePath("/admin/paths");
  back("/admin/paths", "notice", "Learning path deleted");
}

export async function assignPathAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const to = safeReturn(formData, "/admin/paths");
  const targetType = (["USER", "DEPARTMENT", "JOB_TITLE"].includes(text(formData, "targetType")) ? text(formData, "targetType") : "USER") as AssignmentTarget;
  const result = await assignPath(actor, { pathId: text(formData, "pathId"), targetType, targetValue: text(formData, "targetValue"), dueAt: dueDate(text(formData, "dueDate")) });
  if (!result.ok) back(to, "error", result.error);
  revalidatePath(to.split("#")[0]);
  back(to, "notice", "Learning path assigned");
}

export async function unassignPathAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const to = safeReturn(formData, "/admin/paths");
  const result = await unassignPath(actor, text(formData, "assignmentId"));
  if (!result.ok) back(to, "error", result.error);
  revalidatePath(to.split("#")[0]);
  back(to, "notice", "Assignment removed");
}
