import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../lib/auth/current-user";
import { prisma } from "../../../../lib/db/client";
import { courseProgressPercent, lastLessonFor } from "../../../../lib/learning/progress";
import { completeLessonAction } from "../../../actions/progress";
import { registerAction } from "../../../actions/live";
import { saveLabAction } from "../../../actions/labs";
import { parseLabChecklist } from "../../../../lib/learning/labs";
import { VideoLesson } from "../../../../components/VideoLesson";
import { LocalTime } from "../../../../components/LocalTime";

export default async function LearnCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const user = await requireSession();
  const { id } = await params;
  const { error } = await searchParams;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { position: "asc" }, include: { liveSession: { include: { registrations: { where: { userId: user.id } } } }, instructors: { include: { instructor: true } } } },
      progress: { where: { userId: user.id } },
    },
  });
  if (!course || course.status !== "PUBLISHED") notFound();

  const completed = (course.progress[0]?.completedLessonIds as string[] | undefined) ?? [];
  const lessonIds = course.lessons.map((l) => l.id);
  const percent = courseProgressPercent(lessonIds.length, completed, lessonIds);
  const resume = await lastLessonFor(user.id, course.id);
  const progressRows = await prisma.lessonProgress.findMany({ where: { userId: user.id, lessonId: { in: lessonIds } } });
  const positions = new Map(progressRows.map((p) => [p.lessonId, p.positionSeconds]));
  const checkedByLesson = new Map(progressRows.map((p) => [p.lessonId, (p.checkedItemIds as string[] | undefined) ?? []]));

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>{course.title}</h1>
      <p>{course.description}</p>
      <p>Progress: {percent}%</p>
      {error ? <p role="alert">{error}</p> : null}
      {resume ? <p>You stopped at: {course.lessons.find((l) => l.id === resume)?.title}</p> : null}

      {course.lessons.map((l) => {
        const done = completed.includes(l.id);
        return (
          <section key={l.id} style={{ marginBottom: 24 }}>
            <h2>{l.title} {done ? "(complete)" : ""}</h2>
            {l.instructors.length > 0 ? (
              <p>Taught by {l.instructors.map((x) => `${x.instructor.name}${x.instructor.location ? ` (${x.instructor.location})` : ""}${x.instructor.expertise.length ? `: ${x.instructor.expertise.join(", ")}` : ""}`).join("; ")}</p>
            ) : null}
            {l.type === "TEXT" ? <p style={{ whiteSpace: "pre-wrap" }}>{l.body}</p> : null}
            {l.type === "LINK" ? <p><a href={l.url ?? "#"} rel="noopener noreferrer">Open link</a></p> : null}
            {l.type === "PDF" ? <p><a href={`/api/files/${l.id}`}>Open PDF</a></p> : null}
            {l.type === "LIVE_SESSION" && l.liveSession ? (
              <div>
                <p><LocalTime iso={l.liveSession.startsAt.toISOString()} /> to <LocalTime iso={l.liveSession.endsAt.toISOString()} /></p>
                <p><a href={l.liveSession.meetingUrl} rel="noopener noreferrer">Meeting link</a></p>
                {l.liveSession.registrations.length > 0 ? (
                  <p>You are registered{l.liveSession.registrations[0].attended ? " and attended" : ""}.</p>
                ) : (
                  <form action={registerAction}>
                    <input type="hidden" name="sessionId" value={l.liveSession.id} />
                    <button type="submit">Register for this session</button>
                  </form>
                )}
              </div>
            ) : null}
            {l.type === "LAB" ? (
              <form action={saveLabAction}>
                <input type="hidden" name="lessonId" value={l.id} />
                {parseLabChecklist(l.body ?? "").map((item) => (
                  <label key={item.id} style={{ display: "block" }}>
                    <input type="checkbox" name="item" value={item.id} defaultChecked={(checkedByLesson.get(l.id) ?? []).includes(item.id)} /> {item.text}
                  </label>
                ))}
                <button type="submit">Save lab progress</button>
              </form>
            ) : null}
            {l.type === "VIDEO" ? (
              <VideoLesson
                lessonId={l.id}
                src={`/api/files/${l.id}`}
                startAt={positions.get(l.id) ?? 0}
                captionsSrc={l.captionFileKey ? `/api/captions/${l.id}` : null}
              />
            ) : null}
            {!done && l.type !== "LAB" && l.type !== "LIVE_SESSION" ? (
              <form action={completeLessonAction}>
                <input type="hidden" name="lessonId" value={l.id} />
                <button type="submit">Mark complete</button>
              </form>
            ) : null}
          </section>
        );
      })}
    </main>
  );
}
