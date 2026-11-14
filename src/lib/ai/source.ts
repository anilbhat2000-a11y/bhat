import mammoth from "mammoth";
import { convertOfficeBuffer } from "../storage/convert";
import { extOf, signatureMatches } from "../storage/formats";

// Reference material an admin gives the AI assistant (a policy, a product datasheet, an old
// slide deck). PDFs go to Claude as they are, so it sees tables and layout; Word files are
// read as text; PowerPoint and Excel are converted to PDF first. Plain text is used directly.

export type SourceMaterial =
  | { kind: "pdf"; name: string; data: Buffer }
  | { kind: "text"; name: string; text: string };

export const SOURCE_ACCEPT = ".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.md,.csv";
export const SOURCE_MAX_MB = 25; // the Claude API accepts requests up to 32 MB, base64 adds a third
const MAX_TEXT_CHARS = 400_000;

export async function readSourceMaterial(filename: string, data: Buffer): Promise<{ ok: true; source: SourceMaterial } | { ok: false; error: string }> {
  const name = filename.replace(/^.*[\\/]/, "");
  const ext = extOf(name);
  if (data.length === 0) return { ok: false, error: `"${name}" is empty` };
  if (data.length > SOURCE_MAX_MB * 1024 * 1024) return { ok: false, error: `"${name}" is larger than ${SOURCE_MAX_MB} MB. Use a shorter extract.` };
  try {
    if (ext === "txt" || ext === "md" || ext === "csv") {
      const text = data.toString("utf8").replace(/\u0000/g, "");
      return text.trim() ? { ok: true, source: { kind: "text", name, text: text.slice(0, MAX_TEXT_CHARS) } } : { ok: false, error: `"${name}" has no text` };
    }
    if (!signatureMatches(ext, data.subarray(0, 16))) return { ok: false, error: `"${name}" is not a real .${ext} file` };
    if (ext === "pdf") return { ok: true, source: { kind: "pdf", name, data } };
    if (ext === "docx" || ext === "doc") {
      const docx = ext === "doc" ? await convertOfficeBuffer(data, "doc", "docx") : data;
      const text = (await mammoth.extractRawText({ buffer: docx })).value.trim();
      return text ? { ok: true, source: { kind: "text", name, text: text.slice(0, MAX_TEXT_CHARS) } } : { ok: false, error: `"${name}" has no text` };
    }
    if (ext === "pptx" || ext === "ppt" || ext === "xlsx" || ext === "xls") {
      const pdf = await convertOfficeBuffer(data, ext, "pdf");
      if (pdf.length > SOURCE_MAX_MB * 1024 * 1024) return { ok: false, error: `"${name}" is too large once converted. Use a shorter extract.` };
      return { ok: true, source: { kind: "pdf", name, data: pdf } };
    }
  } catch (e) {
    return { ok: false, error: `"${name}" could not be read: ${(e as Error).message}` };
  }
  return { ok: false, error: `"${name}": use a PDF, Word, PowerPoint, Excel or text file` };
}
