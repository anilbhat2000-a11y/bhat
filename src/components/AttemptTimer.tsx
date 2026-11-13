"use client";

import { useEffect, useState } from "react";
import { remainingSeconds } from "../lib/time";

// Shows the time left in local time, and submits the form when time runs out.
export function AttemptTimer({ formId, endsAtIso }: { formId: string; endsAtIso: string }) {
  const end = new Date(endsAtIso);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let submitted = false;
    const tick = () => {
      const s = remainingSeconds(end, new Date());
      setLeft(s);
      if (s === 0 && !submitted) {
        submitted = true;
        (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // end is derived from endsAtIso, which is stable for the page's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, endsAtIso]);

  if (left === null) return null;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <p role="timer" aria-live={left <= 60 ? "assertive" : "off"}>
      Time left: {mm}:{ss} (ends at {end.toLocaleTimeString()} on your clock)
      {left <= 60 && left > 0 ? " — your answers will be submitted automatically." : ""}
    </p>
  );
}
