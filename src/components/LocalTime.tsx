"use client";

import { useEffect, useState } from "react";

// Shows a UTC instant in the viewer's own time zone. Server output is UTC until the page
// loads, so the first paint never guesses a zone.
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(iso.replace("T", " ").slice(0, 16) + " UTC");
  useEffect(() => {
    setText(new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
  }, [iso]);
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>;
}
