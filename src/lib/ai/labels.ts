// How AI draft kinds and statuses are shown to admins.
export const KIND_LABEL: Record<string, string> = { COURSE: "New course", LESSON: "Lesson rewrite", QUESTIONS: "Questions" };
export const STATUS_LABEL: Record<string, [string, string]> = {
  GENERATING: ["Writing…", "badge badge-draft"],
  READY: ["Ready to review", "badge badge-ok"],
  APPLYING: ["Saving…", "badge badge-draft"],
  APPLIED: ["Applied", "badge badge-archived"],
  FAILED: ["Failed", "badge badge-off"],
  DISCARDED: ["Discarded", "badge badge-archived"],
};
