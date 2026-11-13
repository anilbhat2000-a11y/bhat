"use client";

import { useEffect, useRef } from "react";
import { savePositionAction } from "../app/actions/progress";

// Plays a lesson video, resumes from the saved position, and saves progress every 5 seconds.
export function VideoLesson({ lessonId, src, startAt }: { lessonId: string; src: string; startAt: number }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const save = () => {
      if (video.currentTime > 0) void savePositionAction(lessonId, Math.floor(video.currentTime));
    };
    const onLoaded = () => {
      if (startAt > 0 && startAt < video.duration) video.currentTime = startAt;
    };
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("pause", save);
    const timer = setInterval(save, 5000);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("pause", save);
      clearInterval(timer);
    };
  }, [lessonId, startAt]);

  return <video ref={ref} src={src} controls width={640} preload="metadata" />;
}
