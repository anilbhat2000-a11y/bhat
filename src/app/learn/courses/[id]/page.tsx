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
import { groupByModule, learnerCanOpen, totalMinutes } from "../../../../lib/learning/modules";
import { threadsFor } from "../../../../lib/community/community";
import { addPostAction, setPostHiddenAction, submitFeedbackAction } from "../../../actions/community";

function ModerateButton({ courseId, postId, hidden }: { courseId: string; postId: string; hidden: boolean }) {
  return (
    <form action={setPostHiddenAction} style={{ display: "inline" }}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="hidden" value={hidden ? "false" : "true"} />
      <button type="submit">{hidden ? "Show" : "Hide"}</button>
    </form>
  );
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  return h > 0 ? `${h} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;
}

export default async function LearnCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await connection();
  const user = await requireSession();
  const { id } = await params;
  const { error, notice } = await searchParams;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { position: "asc" }, include: { liveSession: { include: { registrations: { where: { userId: user.id } } } }, instructors: { include: { instructor: true } } } },
      modules: { orderBy: { position: "asc" } },
      progress: { where: { userId: user.id } },
    },
  });
  if (!course || !learnerCanOpen(course.status, course.progress.length > 0)) notFound();
  const archived = course.status === "ARCHIVED";
  const groups = groupByModule(course.lessons, course.modules);
  const minutes = totalMinutes(course.modules);
  const finished = !!course.progress[0]?.completedAt;
  const [threads, myFeedback] = await Promise.all([
    threadsFor(user, course.id),
    prisma.courseFeedback.findUnique({ where: { courseId_userId: { courseId: course.id, userId: user.id } } }),
  ]);

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
      <p>Progress: {percent}%{minutes > 0 ? ` · about ${formatMinutes(minutes)} in total` : ""}</p>
      {archived ? <p role="status">This course has been retired. You can review what you completed, but it no longer records progress.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {resume ? <p>You stopped at: {course.lessons.find((l) => l.id === resume)?.title}</p> : null}

      {groups.map((g, gi) => (
      <section key={g.module?.id ?? `none-${gi}`} aria-labelledby={g.module ? `module-${g.module.id}` : undefined}>
        {g.module ? (
          <h2 id={`module-${g.module.id}`}>
            Module {g.module.position}: {g.module.title}
            {g.module.estimatedMinutes ? <small> ({formatMinutes(g.module.estimatedMinutes)})</small> : null}
          </h2>
        ) : course.modules.length > 0 ? <h2>Other lessons</h2> : null}
      {g.lessons.map((l) => {
        const done = completed.includes(l.id);
        const H = course.modules.length > 0 ? "h3" : "h2";
        return (
          <section key={l.id} style={{ marginBottom: 24 }}>
            <H>{l.title} {done ? "(complete)" : ""}</H>
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
            {!done && !archived && l.type !== "LAB" && l.type !== "LIVE_SESSION" ? (
              <form action={completeLessonAction}>
                <input type="hidden" name="lessonId" value={l.id} />
                <button type="submit">Mark complete</button>
              </form>
            ) : null}
          </section>
        );
      })}
      </section>
      ))}

      {finished ? (
        <section id="feedback" aria-labelledby="h-feedback">
          <h2 id="h-feedback">Course feedback</h2>
          <p>{myFeedback ? "Thank you. You can change your answer." : "You finished this course. Two quick questions help us improve it."}</p>
          <form action={submitFeedbackAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <fieldset>
              <legend>How useful was this course? (1 = not useful, 5 = very useful)</legend>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} style={{ marginRight: 12 }}>
                  <input type="radio" name="rating" value={n} required defaultChecked={myFeedback?.rating === n} /> {n}
                </label>
              ))}
            </fieldset>
            <label>What should we improve? (optional)<br />
              <textarea name="comment" rows={3} cols={60} maxLength={2000} defaultValue={myFeedback?.comment ?? ""} />
            </label>
            <br />
            <button type="submit">Send feedback</button>
          </form>
        </section>
      ) : null}

      <section id="qa" aria-labelledby="h-qa">
        <h2 id="h-qa">Questions and answers</h2>
        <p>Ask about this course. Colleagues and the L&amp;D team can answer. Admins moderate posts.</p>
        {!archived ? (
          <form action={addPostAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <label>Your question<br /><textarea name="body" rows={3} cols={60} maxLength={4000} required /></label>
            <br />
            <button type="submit">Post question</button>
          </form>
        ) : null}
        {threads.length === 0 ? <p>No questions yet.</p> : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {threads.map((t) => (
              <li key={t.id} style={{ borderTop: "1px solid #ccc", padding: "8px 0" }}>
                <p style={{ whiteSpace: "pre-wrap", margin: 0 }}><strong>{t.user.name}</strong>{t.user.role === "ADMIN" ? " (L&D)" : ""}: {t.body}{t.hidden ? " [hidden from learners]" : ""}</p>
                {user.role === "ADMIN" ? <ModerateButton courseId={course.id} postId={t.id} hidden={t.hidden} /> : null}
                <ul>
                  {t.replies.map((r) => (
                    <li key={r.id}>
                      <span style={{ whiteSpace: "pre-wrap" }}><strong>{r.user.name}</strong>{r.user.role === "ADMIN" ? " (L&D)" : ""}: {r.body}{r.hidden ? " [hidden from learners]" : ""}</span>
                      {user.role === "ADMIN" ? <ModerateButton courseId={course.id} postId={r.id} hidden={r.hidden} /> : null}
                    </li>
                  ))}
                </ul>
                {!archived && !t.hidden ? (
                  <form action={addPostAction}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="parentId" value={t.id} />
                    <label>Answer <input name="body" maxLength={4000} size={50} required /></label>{" "}
                    <button type="submit">Reply</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
