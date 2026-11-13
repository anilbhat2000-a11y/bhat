"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../../lib/auth/current-user";
import { saveProfile, setUserPhoto } from "../../lib/profile/service";
import type { ProfileInput } from "../../lib/profile/validate";
import type { LanguageLevel } from "../../generated/prisma/client";
import { prisma } from "../../lib/db/client";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const opt = (fd: FormData, key: string) => (text(fd, key).trim() === "" ? null : text(fd, key).trim());
const int = (fd: FormData, key: string) => (text(fd, key).trim() === "" ? null : Number(text(fd, key)));

// Rows are submitted as edu_0_institution, edu_1_institution, and so on. A row is kept only
// when its first field (the one that names it) is filled in; a blank row is ignored.
function rows(fd: FormData, prefix: string, count: number, fields: string[]) {
  const out: Record<string, string>[] = [];
  for (let i = 0; i < count; i++) {
    const row = Object.fromEntries(fields.map((f) => [f, text(fd, `${prefix}_${i}_${f}`).trim()]));
    if (row[fields[0]] !== "") out.push(row);
  }
  return out;
}

export async function saveProfileAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const userId = text(formData, "userId") || actor.id;
  const subjects = await prisma.subject.findMany({ select: { id: true } });
  const skills = subjects
    .map((s) => ({ subjectId: s.id, raw: text(formData, `skill_${s.id}`).trim() }))
    .filter((s) => s.raw !== "")
    .map((s) => ({ subjectId: s.subjectId, selfRating: Number(s.raw) }));
  const education = rows(formData, "edu", 3, ["institution", "qualification", "fieldOfStudy", "startYear", "endYear"]).map((r) => ({
    institution: r.institution,
    qualification: r.qualification,
    fieldOfStudy: r.fieldOfStudy || null,
    startYear: r.startYear ? Number(r.startYear) : null,
    endYear: r.endYear ? Number(r.endYear) : null,
  }));
  const experience = rows(formData, "exp", 3, ["company", "jobTitle", "startMonth", "endMonth", "description"]).map((r) => ({
    company: r.company,
    jobTitle: r.jobTitle,
    startMonth: r.startMonth,
    endMonth: r.endMonth || null,
    description: r.description || null,
  }));
  const externalCertifications = rows(formData, "ext", 3, ["name", "issuingBody", "issuedOn", "proofUrl"]).map((r) => ({
    name: r.name,
    issuingBody: r.issuingBody,
    issuedOn: r.issuedOn ? new Date(r.issuedOn) : null,
    proofUrl: r.proofUrl || null,
  }));
  const languages = rows(formData, "lang", 3, ["language", "level"]).map((r) => ({ language: r.language, level: r.level as LanguageLevel }));

  const input: ProfileInput = {
    phone: opt(formData, "phone"),
    location: opt(formData, "location"),
    bio: opt(formData, "bio"),
    preferredLanguage: opt(formData, "preferredLanguage"),
    skills,
    education,
    experience,
    externalCertifications,
    languages,
  };
  const result = await saveProfile(actor, userId, input);
  if (!result.ok) redirect(`/learn/profile?error=${encodeURIComponent(Object.values(result.errors)[0])}`);
  revalidatePath("/learn/profile");
  redirect("/learn/profile?notice=Profile%20saved");
}

export async function uploadPhotoAction(formData: FormData): Promise<void> {
  const actor = await requireSession();
  const userId = text(formData, "userId") || actor.id;
  const to = "/learn/profile";
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) redirect(`${to}?error=${encodeURIComponent("Choose a photo")}`);
  const result = await setUserPhoto(actor, userId, {
    filename: file.name,
    mime: file.type,
    sizeBytes: file.size,
    bytes: Buffer.from(await file.arrayBuffer()),
  });
  if (!result.ok) redirect(`${to}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(to);
  redirect(`${to}?notice=${encodeURIComponent("Photo saved")}`);
}
