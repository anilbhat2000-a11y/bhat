"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordProctorEventAction } from "../app/actions/attempts";

// Proctored mode. The questions stay hidden until the learner enters full screen. Leaving
// full screen or switching to another tab or window is reported to the server, which keeps
// the count; at the limit the form is submitted as it stands. Browsers without the
// Fullscreen API (some phones) skip the full-screen step, but tab switches still count.
export function ProctorGuard({
  attemptId,
  formId,
  limit,
  initialCount,
  children,
}: {
  attemptId: string;
  formId: string;
  limit: number;
  initialCount: number;
  children: React.ReactNode;
}) {
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [warning, setWarning] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Known only in the browser; null until then, so server and client render the same.
  const [supported, setSupported] = useState<boolean | null>(null);
  const submitted = useRef(false);

  useEffect(() => {
    setSupported(document.fullscreenEnabled);
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const report = useCallback(async (type: "fullscreen-exit" | "tab-hidden") => {
    if (submitted.current) return;
    const r = await recordProctorEventAction(attemptId, type);
    setCount(r.count);
    if (r.mustSubmit) {
      submitted.current = true;
      setWarning("The limit for leaving the test was reached. Your answers are being submitted.");
      (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
    } else {
      setWarning(`You left the test window (${r.count} of ${r.limit} allowed). At ${r.limit}, your answers are submitted automatically.`);
    }
  }, [attemptId, formId]);

  useEffect(() => {
    if (!started) return;
    const onFullscreen = () => {
      if (!document.fullscreenElement) void report("fullscreen-exit");
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void report("tab-hidden");
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [started, report]);

  const begin = async () => {
    if (supported) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        setWarning("Full screen was refused by the browser. Allow it and try again.");
        return;
      }
    }
    setStarted(true);
    setWarning(null);
  };

  const showQuestions = started && (supported === false || fullscreen);

  return (
    <div>
      <p role="note">
        This is a proctored assessment. Stay in full screen and on this tab. Leaving counts as a violation ({count} of {limit} so far).
      </p>
      {warning ? <p role="alert">{warning}</p> : null}
      {!showQuestions && supported !== null ? (
        <button type="button" onClick={begin}>{started ? "Return to full screen" : supported ? "Enter full screen and start" : "Start"}</button>
      ) : null}
      <div hidden={!showQuestions}>{children}</div>
    </div>
  );
}
