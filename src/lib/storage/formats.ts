// Lesson file formats the portal accepts. Browsers show PDF and MP4 directly; other formats
// are converted in the background (Office files to PDF with LibreOffice, MOV and MKV to MP4
// with ffmpeg) and the original is kept for download.

export type FileFamily = "PDF" | "VIDEO" | "OFFICE";
export type Format = { ext: string; family: FileFamily; mime: string; label: string; convertTo?: "pdf" | "mp4" };

export const FORMATS: Format[] = [
  { ext: "pdf", family: "PDF", mime: "application/pdf", label: "PDF" },
  { ext: "mp4", family: "VIDEO", mime: "video/mp4", label: "MP4 video" },
  { ext: "mov", family: "VIDEO", mime: "video/quicktime", label: "MOV video", convertTo: "mp4" },
  { ext: "mkv", family: "VIDEO", mime: "video/x-matroska", label: "MKV video", convertTo: "mp4" },
  { ext: "pptx", family: "OFFICE", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PowerPoint", convertTo: "pdf" },
  { ext: "ppt", family: "OFFICE", mime: "application/vnd.ms-powerpoint", label: "PowerPoint (97-2003)", convertTo: "pdf" },
  { ext: "docx", family: "OFFICE", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word", convertTo: "pdf" },
  { ext: "doc", family: "OFFICE", mime: "application/msword", label: "Word (97-2003)", convertTo: "pdf" },
  { ext: "xlsx", family: "OFFICE", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel", convertTo: "pdf" },
  { ext: "xls", family: "OFFICE", mime: "application/vnd.ms-excel", label: "Excel (97-2003)", convertTo: "pdf" },
];

const BY_EXT = new Map(FORMATS.map((f) => [f.ext, f]));
// Browsers often send a generic type for MKV, MOV or Office files, so the extension decides;
// a declared type, when specific, must still belong to a lesson format.
const GENERIC = new Set(["", "application/octet-stream", "binary/octet-stream", "application/zip", "application/x-zip-compressed", "application/x-cfb", "video/x-msvideo"]);
const ALSO_SENT: Record<string, string[]> = {
  mkv: ["video/mkv", "video/webm", "audio/x-matroska"],
  xls: ["application/excel", "application/x-excel", "application/x-msexcel"],
  doc: ["application/doc"],
  ppt: ["application/mspowerpoint", "application/powerpoint", "application/x-mspowerpoint"],
};

export function extOf(filename: string): string {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(filename.trim());
  return m ? m[1].toLowerCase() : "";
}

export function formatFor(filename: string, mime: string): Format | null {
  const f = BY_EXT.get(extOf(filename));
  if (!f) return null;
  const m = (mime || "").toLowerCase().split(";")[0].trim();
  if (m === f.mime || GENERIC.has(m) || (ALSO_SENT[f.ext] ?? []).includes(m)) return f;
  return null;
}

export const ACCEPT_ATTRIBUTE = [...FORMATS.map((f) => `.${f.ext}`), ...new Set(FORMATS.map((f) => f.mime))].join(",");
export const FORMAT_LIST = "PDF, PowerPoint (.ppt, .pptx), Word (.doc, .docx), Excel (.xls, .xlsx) and video (.mp4, .mov, .mkv)";

// Checks the first bytes of a stored file against its format, so a renamed file of another
// kind is refused.
export function signatureMatches(ext: string, head: Uint8Array): boolean {
  const hex = (n: number) => Array.from(head.slice(0, n), (b) => b.toString(16).padStart(2, "0")).join("");
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  switch (ext) {
    case "pdf": return ascii(0, 5) === "%PDF-";
    case "mp4": case "mov": return ascii(4, 8) === "ftyp" || ["moov", "mdat", "wide", "free", "skip"].includes(ascii(4, 8));
    case "mkv": return hex(4) === "1a45dfa3";
    case "pptx": case "docx": case "xlsx": return hex(4) === "504b0304";
    case "ppt": case "doc": case "xls": return hex(8) === "d0cf11e0a1b11ae1";
    default: return false;
  }
}

export function formatLabel(key: string): string {
  return BY_EXT.get(extOf(key))?.label ?? "file";
}
