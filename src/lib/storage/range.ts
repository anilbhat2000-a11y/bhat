export type Range =
  | { kind: "full" }
  | { kind: "partial"; start: number; end: number }
  | { kind: "unsatisfiable" };

// Parses one 'bytes=' range. Only a single range is supported; anything else serves the whole file.
export function parseRange(header: string | null, size: number): Range {
  if (!header) return { kind: "full" };
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return { kind: "full" };
  if (size === 0) return { kind: "unsatisfiable" };

  let start: number;
  let end: number;
  if (m[1] === "") {
    // Suffix range: the last N bytes.
    const n = Number(m[2]);
    if (n === 0) return { kind: "unsatisfiable" };
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return { kind: "unsatisfiable" };
  return { kind: "partial", start, end };
}
