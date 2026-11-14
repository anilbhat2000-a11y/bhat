import mammoth from "mammoth";
import type { QuestionRow } from "./questions";
import { readSpreadsheet } from "./sheets";
import { convertOfficeBuffer } from "../storage/convert";

// Reads questions from a file an admin uploads: Excel (.xlsx, .xls), CSV, or Word (.docx,
// .doc). Every format becomes the same QuestionRow list, checked by parseQuestionRows, so
// all formats follow the same rules.
//
// Spreadsheet columns (any order, any case):
//   Type | Question | Option 1 … Option 6 (or one "Options" column separated by |) |
//   Correct (option numbers or letters: "2", "B", "1,3", "A|C") | Points | Explanation | Scenario
// For FILL_BLANK, the options are the accepted answers; for MATCHING, each option is
// "left=right"; for SHORT_ANSWER, leave options and correct empty.
//
// Word layout (one question after another):
//   Q1. Which feature moves a running VM to another host?
//   A) vMotion
//   B) vSphere HA
//   Answer: A
//   Explanation: vMotion moves running VMs with no downtime.
// Optional lines: "Type: MULTIPLE", "Points: 2", "Scenario: …". Without a Type line, the type
// is worked out: True/False options make TRUE_FALSE, two or more answers make MULTIPLE, an
// answer with no options makes FILL_BLANK, no options and no answer make SHORT_ANSWER.

export type ParsedFile = { ok: true; rows: (QuestionRow & { source: string })[] } | { ok: false; error: string };

const LETTERS = "ABCDEFGH";
const QUESTION_EXTS = ["xlsx", "xls", "csv", "docx", "doc"];
export const QUESTION_FILE_ACCEPT = ".xlsx,.xls,.csv,.docx,.doc";

// "B" -> "2", "A, C" -> "1|3", "2|4" -> "2|4"
export function correctToNumbers(value: string): string {
  return value.split(/[|,;/\s]+/).map((t) => t.trim()).filter(Boolean)
    .map((t) => (/^[A-Ha-h]$/.test(t) ? String(LETTERS.indexOf(t.toUpperCase()) + 1) : t.replace(/^option\s*/i, "")))
    .join("|");
}

// The correct answer as option numbers. Accepts numbers ("2", "1|3"), letters ("B", "A,C")
// or the text of the correct option ("True", "vMotion").
export function resolveCorrect(raw: string, options: string[]): string {
  const a = raw.trim();
  if (!a) return "";
  const byText = options.findIndex((o) => o.toLowerCase() === a.toLowerCase());
  if (byText >= 0 && !/^[A-Ha-h]$/.test(a) && !/^\d+$/.test(a)) return String(byText + 1);
  return correctToNumbers(a);
}

export function rowsFromSheet(rows: (Record<string, string> & { __row: string })[], sheetLabel = "Row"): (QuestionRow & { source: string })[] {
  return rows.map((r) => {
    const numbered = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => r[`option ${n}`] ?? r[`option${n}`] ?? r[`opt ${n}`] ?? "").filter((x) => x.trim() !== "");
    const options = (r.options ?? r.choices ?? "").trim() || numbered.join("|");
    const type = (r.type ?? r["question type"] ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_") || inferType(options.split("|").filter(Boolean), (r.correct ?? r.answer ?? "").trim());
    const rawCorrect = (r.correct ?? r["correct answer"] ?? r.answer ?? r.answers ?? "").trim();
    let list = options.split("|").map((o) => o.trim()).filter(Boolean);
    if (type === "TRUE_FALSE") list = list.length === 0 ? ["True", "False"] : list.map((o) => o.charAt(0).toUpperCase() + o.slice(1).toLowerCase());
    // For fill-in-the-blank, an answer in the Correct column is an accepted answer.
    if (type === "FILL_BLANK" && list.length === 0 && rawCorrect) list = rawCorrect.split(/[|;]/).map((x) => x.trim()).filter(Boolean);
    return {
      type,
      text: (r.question ?? r.text ?? r["question text"] ?? "").trim(),
      options: list.join("|"),
      correct: ["FILL_BLANK", "MATCHING", "SHORT_ANSWER"].includes(type) ? "" : resolveCorrect(rawCorrect, list),
      points: (r.points ?? r.marks ?? "").trim() || "1",
      explanation: (r.explanation ?? r.rationale ?? "").trim(),
      scenario: (r.scenario ?? "").trim(),
      source: `${sheetLabel} ${r.__row}`,
    };
  });
}

function inferType(options: string[], answer: string): string {
  const opts = options.map((o) => o.trim().toLowerCase());
  if (opts.length === 2 && opts[0] === "true" && opts[1] === "false") return "TRUE_FALSE";
  if (opts.length === 0) return answer ? "FILL_BLANK" : "SHORT_ANSWER";
  if (opts.every((o) => o.includes("="))) return "MATCHING";
  return answer.split(/[|,;\s]+/).filter(Boolean).length > 1 ? "MULTIPLE" : "SINGLE";
}

// Parses the Word layout described above from plain text.
export function rowsFromText(text: string): (QuestionRow & { source: string })[] {
  type Draft = { n: number; text: string[]; options: string[]; answer: string; type: string; points: string; explanation: string[]; scenario: string };
  const drafts: Draft[] = [];
  let cur: Draft | null = null;
  let field: "text" | "explanation" = "text";
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/ /g, " ").trim());
  for (const line of lines) {
    if (!line) continue;
    const q = /^(?:Q(?:uestion)?\s*\d*\s*[.:)\-]|\d{1,3}\s*[.)])\s*(.*)$/i.exec(line);
    const opt = /^\(?([A-Ha-h])[.)]\s+(.+)$/.exec(line);
    const kv = /^(Answer|Answers|Correct(?:\s+answer)?|Type|Points?|Marks?|Explanation|Scenario)\s*[:\-–]\s*(.*)$/i.exec(line);
    if (q && !(cur && opt)) {
      cur = { n: drafts.length + 1, text: q[1] ? [q[1]] : [], options: [], answer: "", type: "", points: "", explanation: [], scenario: "" };
      drafts.push(cur);
      field = "text";
      continue;
    }
    if (!cur) continue;
    if (kv) {
      const key = kv[1].toLowerCase();
      if (key.startsWith("answer") || key.startsWith("correct")) cur.answer = kv[2];
      else if (key === "type") cur.type = kv[2].toUpperCase().replace(/[\s-]+/g, "_");
      else if (key.startsWith("point") || key.startsWith("mark")) cur.points = kv[2];
      else if (key === "explanation") { cur.explanation = [kv[2]]; field = "explanation"; }
      else if (key === "scenario") cur.scenario = kv[2];
      continue;
    }
    if (opt && field === "text") { cur.options.push(opt[2].trim()); continue; }
    if (field === "explanation") cur.explanation.push(line);
    else if (cur.options.length === 0) cur.text.push(line);
  }
  return drafts.map((d) => {
    const type = d.type || inferType(d.options, d.answer);
    const isTF = type === "TRUE_FALSE";
    const options = isTF && d.options.length === 0 ? ["True", "False"] : d.options.map((o) => (isTF ? o.charAt(0).toUpperCase() + o.slice(1).toLowerCase() : o));
    let correct = "";
    if (type === "FILL_BLANK") {
      return { type, text: d.text.join(" "), options: d.answer.split(/[|;]/).map((x) => x.trim()).filter(Boolean).join("|"), correct: "", points: d.points || "1", explanation: d.explanation.join(" "), scenario: d.scenario, source: `Question ${d.n}` };
    }
    if (type !== "MATCHING" && type !== "SHORT_ANSWER") correct = resolveCorrect(d.answer, options);
    return { type, text: d.text.join(" "), options: options.join("|"), correct, points: d.points || "1", explanation: d.explanation.join(" "), scenario: d.scenario, source: `Question ${d.n}` };
  });
}

export async function parseQuestionFile(filename: string, data: Buffer): Promise<ParsedFile> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (!QUESTION_EXTS.includes(ext)) return { ok: false, error: "Use an Excel (.xlsx, .xls), CSV or Word (.docx, .doc) file for questions" };
  try {
    if (ext === "docx" || ext === "doc") {
      const docx = ext === "doc" ? await convertOfficeBuffer(data, "doc", "docx") : data;
      const { value } = await mammoth.extractRawText({ buffer: docx });
      const rows = rowsFromText(value);
      return rows.length > 0 ? { ok: true, rows } : { ok: false, error: "No questions found. Start each question with \"Q1.\" (or \"1.\") and write options as \"A)\", \"B)\"." };
    }
    const sheets = await readSpreadsheet(filename, data);
    const sheet = sheets.get("questions") ?? [...sheets.values()].find((rows) => rows.length > 0) ?? [];
    const rows = rowsFromSheet(sheet);
    return rows.length > 0 ? { ok: true, rows } : { ok: false, error: "No questions found. The first row must be the column headings (Type, Question, Option 1…, Correct, Points)." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
