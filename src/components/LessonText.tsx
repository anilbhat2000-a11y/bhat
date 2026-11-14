import type { ReactNode } from "react";

// Shows lesson text written in a small, safe subset of Markdown:
//   blank line = new paragraph, "- item" = bullet list, "1. item" = numbered list,
//   "## Heading" = sub-heading, "> text" = highlighted note, **bold**, `code`.
// Everything is rendered as React text, so lesson authors cannot inject HTML or script.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined ? <strong key={m.index}>{m[1]}</strong> : <code key={m.index}>{m[2]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function LessonText({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="lesson-text">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim());
        if (lines.every((l) => /^[-*] /.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        }
        if (lines.every((l) => /^\d+[.)] /.test(l))) {
          return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+[.)] /, ""))}</li>)}</ol>;
        }
        if (/^#{1,4} /.test(lines[0]) && lines.length === 1) {
          return <p key={i} className="lesson-subhead">{inline(lines[0].replace(/^#{1,4} /, ""))}</p>;
        }
        if (lines.every((l) => l.startsWith(">"))) {
          return <p key={i} className="lesson-note">{inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "))}</p>;
        }
        // A heading line followed by text or a list in the same block.
        if (/^#{1,4} /.test(lines[0])) {
          return (
            <div key={i}>
              <p className="lesson-subhead">{inline(lines[0].replace(/^#{1,4} /, ""))}</p>
              <LessonText body={lines.slice(1).join("\n")} />
            </div>
          );
        }
        // A paragraph followed by a list without a blank line between them.
        const firstItem = lines.findIndex((l) => /^[-*] /.test(l) || /^\d+[.)] /.test(l));
        if (firstItem > 0) {
          return (
            <div key={i}>
              <p>{inline(lines.slice(0, firstItem).join(" "))}</p>
              <LessonText body={lines.slice(firstItem).join("\n")} />
            </div>
          );
        }
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}
