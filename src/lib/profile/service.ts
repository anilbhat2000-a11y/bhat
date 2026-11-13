import { prisma } from "../db/client";
import { AuthError } from "../auth/guards";
import type { SessionUser } from "../auth/session";
import { recordAudit } from "../audit/record";
import { defaultStorage } from "../storage";
import type { FileStorage } from "../storage/types";
import { validateUpload } from "../storage/validate";
import { validateProfileEdit, type ProfileInput } from "./validate";

// Owners and administrators can change a profile. Managers can view theirs, not edit it.
function mayEdit(actor: SessionUser, userId: string): boolean {
  return actor.role === "ADMIN" || actor.id === userId;
}

export async function saveProfile(
  actor: SessionUser,
  userId: string,
  input: ProfileInput,
): Promise<{ ok: true } | { ok: false; errors: Record<string, string> }> {
  if (!mayEdit(actor, userId)) throw new AuthError(403);
  const check = validateProfileEdit(actor, input);
  if (!check.ok) return check;

  await prisma.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(input.phone !== undefined && { phone: input.phone?.trim() || null }),
        ...(input.location !== undefined && { location: input.location?.trim() || null }),
        ...(input.bio !== undefined && { bio: input.bio?.trim() || null }),
        ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage || null }),
        ...(actor.role === "ADMIN" && input.department !== undefined && { department: input.department?.trim() || null }),
        ...(actor.role === "ADMIN" && input.jobTitle !== undefined && { jobTitle: input.jobTitle?.trim() || null }),
        ...(actor.role === "ADMIN" && input.managerId !== undefined && { managerId: input.managerId || null }),
        ...(actor.role === "ADMIN" && input.joinedOn !== undefined && { joinedOn: input.joinedOn }),
      },
    });
    if (input.skills) {
      await tx.profileSkill.deleteMany({ where: { userId } });
      await tx.profileSkill.createMany({ data: input.skills.map((s) => ({ userId, subjectId: s.subjectId, selfRating: s.selfRating })) });
    }
    if (input.education) {
      await tx.profileEducation.deleteMany({ where: { userId } });
      await tx.profileEducation.createMany({ data: input.education.map((e) => ({ userId, ...e })) });
    }
    if (input.experience) {
      await tx.profileExperience.deleteMany({ where: { userId } });
      await tx.profileExperience.createMany({ data: input.experience.map((e) => ({ userId, ...e })) });
    }
    if (input.externalCertifications) {
      await tx.profileExternalCertification.deleteMany({ where: { userId } });
      await tx.profileExternalCertification.createMany({
        data: input.externalCertifications.map((c) => ({ userId, name: c.name, issuingBody: c.issuingBody, issuedOn: c.issuedOn ?? null, proofUrl: c.proofUrl ?? null })),
      });
    }
    if (input.languages) {
      await tx.profileLanguage.deleteMany({ where: { userId } });
      await tx.profileLanguage.createMany({ data: input.languages.map((l) => ({ userId, language: l.language, level: l.level })) });
    }
    await recordAudit(tx, {
      actorId: actor.id,
      action: "profile.update",
      entityType: "User",
      entityId: userId,
      before: { phone: before.phone, location: before.location, bio: before.bio },
      after: { phone: input.phone ?? before.phone, location: input.location ?? before.location, bio: input.bio ?? before.bio },
    });
  });
  return { ok: true };
}

// Stores a profile photo through the file storage, checked against the photo size limit,
// and removes the previous photo only after the new one is recorded.
export async function setUserPhoto(
  actor: SessionUser,
  userId: string,
  file: { filename: string; mime: string; sizeBytes: number; bytes: Buffer },
  storage: FileStorage = defaultStorage(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mayEdit(actor, userId)) throw new AuthError(403);
  const checked = validateUpload({ filename: file.filename, mime: file.mime, sizeBytes: file.sizeBytes }, "IMAGE");
  if (!checked.ok) return { ok: false, error: checked.reason };
  const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await storage.put(checked.key, file.bytes);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { photoFileKey: checked.key } });
    await recordAudit(tx, { actorId: actor.id, action: "user.photo", entityType: "User", entityId: userId, before: { photo: before.photoFileKey }, after: { photo: checked.key } });
  });
  if (before.photoFileKey) await storage.delete(before.photoFileKey);
  return { ok: true };
}
