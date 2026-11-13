"use client";

import { useEffect, useRef } from "react";
import { savePositionAction } from "../app/actions/progress";

// Plays a lesson video, resumes from the saved position, saves progress every 5 seconds,
// and offers the lesson's captions when it has them.
export function VideoLesson({
  lessonId,
  src,
  startAt,
  captionsSrc,
}: {
  lessonId: string;
  src: string;
  startAt: number;
  captionsSrc: string | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const save = () => {
      if (video.currentTime > 0) void savePositionAction(lessonId, Math.floor(video.currentTime), Number.isFinite(video.duration) ? video.duration : undefined);
    };
    const onLoaded = () => {
      if (startAt > 0 && startAt < video.duration) video.currentTime = startAt;
    };
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("pause", save);
    video.addEventListener("ended", save);
    const timer = setInterval(save, 5000);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("pause", save);
      video.removeEventListener("ended", save);
      clearInterval(timer);
    };
  }, [lessonId, startAt]);

  return (
    <video ref={ref} src={src} controls width={640} preload="metadata">
      {captionsSrc ? <track kind="captions" srcLang="en" label="English" src={captionsSrc} default /> : null}
    </video>
  );
}
