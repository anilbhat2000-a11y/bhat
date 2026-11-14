import ExcelJS from "exceljs";
import { parseCsvRows } from "./csv";
import { convertOfficeBuffer } from "../storage/convert";

export type SheetRows = Record<string, string>[];

// Header names are compared without case, extra spaces or punctuation, so "Question text",
// "question_text" and "QUESTION TEXT" are the same column.
export const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("hyperlink" in v && typeof v.hyperlink === "string") return v.hyperlink;
  }
  return String(v);
}

// Reads every sheet of an Excel workbook (.xlsx, or .xls converted with LibreOffice) or a
// CSV file into rows keyed by normalised header. Empty rows are skipped; each row keeps its
// sheet row number for error messages.
export async function readSpreadsheet(filename: string, data: Buffer): Promise<Map<string, (Record<string, string> & { __row: string })[]>> {
  const ext = filename.toLowerCase().split(".").pop();
  const out = new Map<string, (Record<string, string> & { __row: string })[]>();
  if (ext === "csv") {
    const rows = parseCsvRows(data.toString("utf8").replace(/^﻿/, ""));
    out.set("csv", rows.map((r, i) => ({ ...Object.fromEntries(Object.entries(r).map(([k, v]) => [normHeader(k), (v ?? "").trim()])), __row: String(i + 2) })));
    return out;
  }
  let xlsx = data;
  if (ext === "xls") xlsx = await convertOfficeBuffer(data, "xls", "xlsx");
  else if (ext !== "xlsx") throw new Error("Use an Excel file (.xlsx or .xls) or a CSV file");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(xlsx as unknown as ArrayBuffer);
  } catch {
    throw new Error("The spreadsheet could not be read. Check it opens in Excel and save it as .xlsx.");
  }
  wb.eachSheet((ws) => {
    let headers: string[] = [];
    const rows: (Record<string, string> & { __row: string })[] = [];
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1).map((v) => cellText(v).trim());
      if (headers.length === 0) {
        headers = values.map(normHeader);
        return;
      }
      if (values.every((v) => v === "")) return;
      const rec: Record<string, string> & { __row: string } = { __row: String(n) };
      headers.forEach((h, i) => { if (h) rec[h] = values[i] ?? ""; });
      rows.push(rec);
    });
    out.set(normHeader(ws.name), rows);
  });
  return out;
}
