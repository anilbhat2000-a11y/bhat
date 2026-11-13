// Minimal RFC 4180 reader: quoted fields, doubled quotes, CRLF or LF line endings.
// The first row is the header; each record becomes an object keyed by header name.
export function parseCsvRows(text: string): Record<string, string>[] {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      records.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); records.push(row); }

  const [header, ...body] = records.filter((r) => !(r.length === 1 && r[0] === ""));
  if (!header) return [];
  return body.map((cells) =>
    Object.fromEntries(header.map((name, idx) => [name.trim(), (cells[idx] ?? "").trim()])),
  );
}
