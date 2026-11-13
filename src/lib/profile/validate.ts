import type { LanguageLevel } from "../../generated/prisma/client";
import type { SessionUser } from "../auth/session";

export type ProfileInput = {
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  preferredLanguage?: string | null;
  // Set by an administrator only.
  department?: string | null;
  jobTitle?: string | null;
  managerId?: string | null;
  joinedOn?: Date | null;
  skills?: { subjectId: string; selfRating: number }[];
  education?: { institution: string; qualification: string; fieldOfStudy?: string | null; startYear?: number | null; endYear?: number | null }[];
  experience?: { company: string; jobTitle: string; startMonth: string; endMonth?: string | null; description?: string | null }[];
  externalCertifications?: { name: string; issuingBody: string; issuedOn?: Date | null; proofUrl?: string | null }[];
  languages?: { language: string; level: LanguageLevel }[];
};

export const ADMIN_ONLY = ["department", "jobTitle", "managerId", "joinedOn"] as const;
const LEVELS: LanguageLevel[] = ["BASIC", "WORKING", "FLUENT"];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export type ProfileErrors = Record<string, string>;

// An employee edits their own personal details and lists. Employment fields are
// refused unless the actor is an administrator.
export function validateProfileEdit(
  actor: SessionUser,
  input: ProfileInput,
): { ok: true } | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const isAdmin = actor.role === "ADMIN";

  for (const key of ADMIN_ONLY) {
    if (!isAdmin && input[key] !== undefined) {
      errors[key] = "Employment details are set by an administrator";
    }
  }
  if (input.bio && input.bio.length > 500) errors.bio = "Bio must be 500 characters or fewer";
  for (const s of input.skills ?? []) {
    if (!Number.isInteger(s.selfRating) || s.selfRating < 1 || s.selfRating > 5) {
      errors.skills = "Self rating must be a whole number from 1 to 5";
    }
  }
  for (const e of input.experience ?? []) {
    if (!MONTH.test(e.startMonth)) errors.experience = "Start month must look like 2024-03";
    if (e.endMonth && !MONTH.test(e.endMonth)) errors.experience = "End month must look like 2024-03";
    if (e.description && e.description.length > 1000) errors.experience = "Experience descriptions must be 1000 characters or fewer";
  }
  const seenLanguages = new Set<string>();
  for (const l of input.languages ?? []) {
    if (!l.language.trim()) errors.languages = "Each language row needs a language name";
    else if (seenLanguages.has(l.language.trim().toLowerCase())) errors.languages = "Each language can be listed once";
    seenLanguages.add(l.language.trim().toLowerCase());
    if (!LEVELS.includes(l.level)) errors.languages = "Language level must be basic, working, or fluent";
  }
  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}
