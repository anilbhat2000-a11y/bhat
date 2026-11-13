// A video lesson can be published only with a caption file (WebVTT), so deaf and hard of
// hearing learners can follow it. Other lesson types need nothing extra.
export function canPublishLesson(lesson: { type: string; captionFileKey: string | null }): { ok: true } | { ok: false; reason: string } {
  if (lesson.type === "VIDEO" && !lesson.captionFileKey) {
    return { ok: false, reason: "Captions (.vtt) are required for video lessons" };
  }
  return { ok: true };
}
