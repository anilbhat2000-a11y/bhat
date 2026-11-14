"use client";

import { useEffect, useRef, useState } from "react";
import { savePositionAction } from "../app/actions/progress";

// Plays a lesson video, resumes from the saved position, saves progress every 5 seconds,
// and offers the lesson's captions when it has them.
export function VideoLesson({
  lessonId,
  src,
  startAt,
  captionsSrc,
  downloadSrc,
  preparing = false,
}: {
  lessonId: string;
  src: string;
  startAt: number;
  captionsSrc: string | null;
  downloadSrc?: string;
  preparing?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

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
    <div className="video-lesson">
      {preparing ? <p className="muted">This video is being converted for smooth playback in every browser. If it does not play yet, refresh in a few minutes.</p> : null}
      <video ref={ref} src={src} controls preload="metadata" onError={() => setFailed(true)} style={{ maxWidth: "100%", width: 720 }}>
        {captionsSrc ? <track kind="captions" srcLang="en" label="English" src={captionsSrc} default /> : null}
      </video>
      {failed ? (
        <p role="alert">Your browser cannot play this video format.{downloadSrc ? <> <a href={downloadSrc}>Download the video</a> and play it on your computer.</> : null}</p>
      ) : downloadSrc ? <p><a href={downloadSrc}>Download the video</a></p> : null}
    </div>
  );
}
