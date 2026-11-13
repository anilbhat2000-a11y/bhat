import { randomUUID } from "node:crypto";

export type UploadKind = "DOCUMENT" | "VIDEO" | "IMAGE" | "CAPTION";

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
};

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
