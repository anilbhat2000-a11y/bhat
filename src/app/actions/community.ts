"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { assignCourse, unassignCourse } from "../../lib/learning/assignments";
import { addPost, createAnnouncement, deleteAnnouncement, setPostHidden, submitFeedback } from "../../lib/community/community";
import { smtpMailer } from "../../lib/notifications/mailer";
import type { AssignmentTarget } from "../../generated/prisma/client";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
function back(to: string, kind: "error" | "notice", message: string): never {
  const [path, hash] = to.split("#");
  redirect(`${path}?${kind}=${encodeURIComponent(message)}${hash ? `#${hash}` : ""}`);
}
// Only paths inside the portal may be returned to.
const safeReturn = (fd: FormData, fallback: string) => {
  const to = text(fd, "returnTo");
  return /^\/(admin|manager|learn)\/[\w\-/#]*$/.test(to) ? to : fallback;
};

// A date field (YYYY-MM-DD) means the end of that day, India time.
function dueDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T23:59:59+05:30`);
}

export async function assignCourseAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const to = safeReturn(formData, "/admin/courses");
  const targetType = (["USER", "DEPARTMENT", "JOB_TITLE"].includes(text(formData, "targetType")) ? text(formData, "targetType") : "USER") as AssignmentTarget;
  const result = await assignCourse(actor, {
    courseId: text(formData, "courseId"),
    targetType,
    targetValue: text(formData, "targetValue"),
    dueAt: dueDate(text(formData, "dueDate")),
  });
  if (!result.ok) back(to, "error", result.error);
  revalidatePath(to.split("#")[0]);
  back(to, "notice", "Course assigned");
}

export async function unassignCourseAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const to = safeReturn(formData, "/admin/courses");
  const result = await unassignCourse(actor, text(formData, "assignmentId"));
  if (!result.ok) back(to, "error", result.error);
  revalidatePath(to.split("#")[0]);
  back(to, "notice", "Assignment removed");
}

export async function createAnnouncementAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const email = text(formData, "email") === "on";
  let mailer;
  if (email) {
    try {
      mailer = smtpMailer();
    } catch {
      back("/admin/announcements", "error", "Email is not set up (SMTP_URL). The announcement was not posted.");
    }
  }
  const result = await createAnnouncement(actor, { title: text(formData, "title"), body: text(formData, "body"), department: text(formData, "department") }, mailer);
  if (!result.ok) back("/admin/announcements", "error", result.error);
  revalidatePath("/admin/announcements");
  back("/admin/announcements", "notice", email ? `Announcement posted and emailed to ${result.emailed} people` : "Announcement posted");
}

export async function deleteAnnouncementAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const result = await deleteAnnouncement(actor, text(formData, "id"));
  if (!result.ok) back("/admin/announcements", "error", result.error);
  revalidatePath("/admin/announcements");
  back("/admin/announcements", "notice", "Announcement removed");
}

export async function submitFeedbackAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const to = `/learn/courses/${courseId}#feedback`;
  const result = await submitFeedback(actor, courseId, { rating: Number(text(formData, "rating")), comment: text(formData, "comment") });
  if (!result.ok) back(to, "error", result.error);
  revalidatePath(`/learn/courses/${courseId}`);
  back(to, "notice", "Thank you for your feedback");
}

export async function addPostAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const to = `/learn/courses/${courseId}#qa`;
  const result = await addPost(actor, courseId, { body: text(formData, "body"), parentId: text(formData, "parentId") || null });
  if (!result.ok) back(to, "error", result.error);
  revalidatePath(`/learn/courses/${courseId}`);
  back(to, "notice", "Posted");
}

export async function setPostHiddenAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const courseId = text(formData, "courseId");
  const to = `/learn/courses/${courseId}#qa`;
  const result = await setPostHidden(actor, text(formData, "postId"), text(formData, "hidden") === "true");
  if (!result.ok) back(to, "error", result.error);
  revalidatePath(`/learn/courses/${courseId}`);
  back(to, "notice", text(formData, "hidden") === "true" ? "Post hidden" : "Post shown again");
}
