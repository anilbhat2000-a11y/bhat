import { randomUUID } from "node:crypto";

import { formatFor } from "./formats";

export type UploadKind = "DOCUMENT" | "VIDEO" | "IMAGE" | "CAPTION" | "OFFICE";

type Rule = { mimes: Record<string, string>; limitMb: () => number };

const MB = 1024 * 1024;

// mime -> extension used for the stored key. The original filename is never used.
const RULES: Record<UploadKind, Rule> = {
  DOCUMENT: { mimes: { "application/pdf": "pdf" }, limitMb: () => Number(process.env.MAX_UPLOAD_MB_DOC ?? 50) },
  VIDEO: { mimes: { "video/mp4": "mp4" }, limitMb: () => Number(process.env.MAX_UPLOAD_MB_VIDEO ?? 500) },
  // Images cover lesson pictures and profile photos; the photo limit (5 MB) applies to both.
  IMAGE: {
    mimes: { "image/png": "png", "image/jpeg": "jpg" },
    limitMb: () => Number(process.env.MAX_UPLOAD_MB_PHOTO ?? 5),
  },
  CAPTION: { mimes: { "text/vtt": "vtt" }, limitMb: () => 1 },
  // PowerPoint, Word and Excel lesson files (converted to PDF for viewing).
  OFFICE: { mimes: {}, limitMb: () => Number(process.env.MAX_UPLOAD_MB_OFFICE ?? 100) },
};

// Any lesson file format (see formats.ts): returns the size rule that applies and a stored
// key with the file's own extension, or a reason it is refused.
export function validateLessonFile(input: { filename: string; mime: string }):
  { ok: true; key: string; kind: UploadKind; ext: string } | { ok: false; reason: string } {
  const f = formatFor(input.filename, input.mime);
  if (!f) return { ok: false, reason: `This file type is not allowed: "${input.filename}". Use PDF, PowerPoint, Word, Excel, MP4, MOV or MKV.` };
  const kind: UploadKind = f.family === "PDF" ? "DOCUMENT" : f.family === "VIDEO" ? "VIDEO" : "OFFICE";
  return { ok: true, key: `${randomUUID()}.${f.ext}`, kind, ext: f.ext };
}

export function sizeLimitBytes(kind: UploadKind): number {
  return RULES[kind].limitMb() * MB;
}

export function validateUpload(
  input: { filename: string; mime: string; sizeBytes: number },
  kind: UploadKind,
): { ok: true; key: string } | { ok: false; reason: string } {
  const rule = RULES[kind];
  const ext = rule.mimes[input.mime];
  if (!ext) {
    return { ok: false, reason: `File type ${input.mime} is not allowed here` };
  }
  const limit = sizeLimitBytes(kind);
  if (input.sizeBytes > limit) {
    return { ok: false, reason: `File is too large: the size limit is ${rule.limitMb()} MB` };
  }
  return { ok: true, key: `${randomUUID()}.${ext}` };
}
