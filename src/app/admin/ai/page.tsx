import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { aiEnabled, aiModel } from "../../../lib/ai/engine";
import { listDrafts } from "../../../lib/ai/drafts";
import { SOURCE_ACCEPT, SOURCE_MAX_MB } from "../../../lib/ai/source";
import { KIND_LABEL, STATUS_LABEL } from "../../../lib/ai/labels";
import { LessonText } from "../../../components/LessonText";
import { requestCourseDraftAction, requestLessonDraftAction, requestQuestionsDraftAction } from "../../actions/ai";

type Search = { lesson?: string; course?: string; pick?: string; error?: string; notice?: string };

const date = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

function SourceField() {
  return (
    <label>Reference file (optional){" "}
      <input type="file" name="source" accept={SOURCE_ACCEPT} aria-label="Reference file" />
      <small className="fieldset-help">A policy, process note, datasheet or old slide deck the AI should follow: PDF, Word, PowerPoint, Excel or text, up to {SOURCE_MAX_MB} MB. Company-specific facts are then taken from your file instead of left as placeholders.</small>
    </label>
  );
}

// The AI assistant: drafts a new course, rewrites a lesson, or writes completion-check
// questions. Every result is a draft that an admin reviews and applies.
export default async function AiAssistantPage({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const actor = await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const enabled = aiEnabled();
  const [subjects, courses, drafts, lesson, course, picked] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    listDrafts(actor),
    sp.lesson ? prisma.lesson.findUnique({ where: { id: sp.lesson }, include: { course: { select: { id: true, title: true } } } }) : null,
    sp.course ? prisma.course.findUnique({ where: { id: sp.course }, select: { id: true, title: true, _count: { select: { lessons: { where: { type: "TEXT" } } } } } }) : null,
    sp.pick ? prisma.course.findUnique({ where: { id: sp.pick }, select: { id: true, title: true, lessons: { where: { type: "TEXT" }, orderBy: { position: "asc" }, select: { id: true, title: true } } } }) : null,
  ]);
  const disabled = !enabled;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>AI assistant</h1>
          <p className="muted">Claude, an AI model by Anthropic, drafts course content in the portal&apos;s house style: clear headings, key terms, a real-world example, common mistakes and takeaways. <strong>Nothing reaches learners until you review and apply a draft</strong>, and new courses are saved unpublished.</p>
        </div>
      </div>
      {sp.error ? <p role="alert">{sp.error}</p> : null}
      {sp.notice ? <p role="status">{sp.notice}</p> : null}

      {enabled ? (
        <p className="muted" data-test="ai-status">AI is on (model {aiModel()}). Requests and the reference files you attach are sent to Anthropic over the internet; do not attach personal data about employees or customers.</p>
      ) : (
        <section className="card" data-test="ai-off" aria-labelledby="h-off">
          <h2 id="h-off">The AI assistant is switched off</h2>
          <p>To switch it on, the server administrator adds an Anthropic API key to the <code>.env</code> file and restarts the portal:</p>
          <ol>
            <li>Create a key at <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a> (Settings → API keys). Usage is billed by Anthropic to that account.</li>
            <li>Add the line <code>ANTHROPIC_API_KEY=your-key</code> to <code>.env</code>.</li>
            <li>Make sure the server can reach <code>api.anthropic.com</code> on port 443.</li>
            <li>Run <code>docker compose up -d</code>.</li>
          </ol>
          <p className="muted">The rest of the portal works without it.</p>
        </section>
      )}

      {lesson ? (
        <section className="card" aria-labelledby="h-lesson">
          <h2 id="h-lesson">Improve a lesson: {lesson.title}</h2>
          <p className="muted">From <a href={`/admin/courses/${lesson.course.id}`}>{lesson.course.title}</a>. The AI rewrites the lesson; you compare the old and new text and choose whether to save it.</p>
          {lesson.type !== "TEXT" ? <p role="alert">Only text lessons can be rewritten. For a PDF or video lesson, attach the file to a new course request or to a questions request instead.</p> : (
            <form action={requestLessonDraftAction} data-test="ai-lesson-form">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <label>What should change? (optional)
                <textarea name="instruction" rows={3} maxLength={4000} aria-label="What should change" placeholder="For example: update for the latest GST e-invoicing rules; add an example from a data-centre project; simplify for new joiners" style={{ width: "100%" }} />
              </label>
              <SourceField />
              <button type="submit" disabled={disabled}>Write an improved version</button>
            </form>
          )}
          <details>
            <summary>Current text</summary>
            <LessonText body={lesson.body ?? ""} />
          </details>
        </section>
      ) : null}

      {course ? (
        <section className="card" aria-labelledby="h-q">
          <h2 id="h-q">Write questions for {course.title}</h2>
          <p className="muted">The AI reads the course&apos;s {course._count.lessons} text lessons and writes questions about them. You tick the ones to keep; they are added to the course&apos;s completion check.</p>
          <form action={requestQuestionsDraftAction} data-test="ai-questions-form">
            <input type="hidden" name="courseId" value={course.id} />
            <label>How many questions <input type="number" name="count" min={1} max={30} defaultValue={10} aria-label="How many questions" /></label>{" "}
            <label>Instructions (optional) <input name="notes" maxLength={4000} aria-label="Question instructions" placeholder="For example: focus on the escalation process" style={{ width: "100%", maxWidth: 520 }} /></label>
            <SourceField />
            <button type="submit" disabled={disabled}>Write questions</button>
          </form>
        </section>
      ) : null}

      {!lesson && !course ? (
        <>
          <section className="card" aria-labelledby="h-course">
            <h2 id="h-course">Create a new course</h2>
            <p className="muted">Describe the topic. The AI writes the modules, lessons and completion-check questions; a 3 × 3 course takes two to five minutes.</p>
            <form action={requestCourseDraftAction} data-test="ai-course-form">
              <label>Topic <input name="topic" required maxLength={300} aria-label="Topic" placeholder="For example: Handling a Severity 1 network outage for an enterprise customer" style={{ width: "100%" }} /></label>
              <br />
              <label>Subject{" "}
                <select name="subjectId" required defaultValue="" aria-label="Subject">
                  <option value="" disabled>Choose a subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>{" "}
              <label>Level{" "}
                <select name="level" defaultValue="BASIC" aria-label="Level">
                  <option value="BASIC">Basic</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </label>
              <br />
              <label>Who is it for? <input name="audience" maxLength={300} aria-label="Audience" placeholder="For example: NOC engineers in their first year" style={{ width: "100%", maxWidth: 520 }} /></label>
              <br />
              <label>Modules <input type="number" name="modules" min={1} max={8} defaultValue={3} aria-label="Modules" /></label>{" "}
              <label>Lessons per module <input type="number" name="lessonsPerModule" min={1} max={5} defaultValue={3} aria-label="Lessons per module" /></label>{" "}
              <label>Questions <input type="number" name="questions" min={0} max={30} defaultValue={10} aria-label="Questions" /></label>
              <br />
              <label>Anything else? (optional)
                <textarea name="notes" rows={3} maxLength={4000} aria-label="Extra instructions" placeholder="For example: follow our escalation matrix; mention our ticketing tool; include a lesson on customer communication" style={{ width: "100%" }} />
              </label>
              <SourceField />
              <button type="submit" disabled={disabled}>Draft the course</button>
            </form>
          </section>

          <section className="card" aria-labelledby="h-update">
            <h2 id="h-update">Update existing content</h2>
            <p className="muted">Choose a course, then a lesson to improve, or write new completion-check questions for it. You can also use the <strong>Improve with AI</strong> link next to any text lesson on a course page.</p>
            <form method="get" className="toolbar">
              <label>Course{" "}
                <select name="pick" defaultValue={picked?.id ?? ""} aria-label="Course to update">
                  <option value="" disabled>Choose a course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
              <button type="submit">Show lessons</button>
            </form>
            {picked ? (
              <div data-test="ai-pick">
                <p><a className="btn-outline" href={`/admin/ai?course=${picked.id}`}>Write questions for this course</a></p>
                {picked.lessons.length === 0 ? <p className="muted">This course has no text lessons to improve.</p> : (
                  <ul>
                    {picked.lessons.map((l) => <li key={l.id}>{l.title} · <a href={`/admin/ai?lesson=${l.id}`}>Improve with AI</a></li>)}
                  </ul>
                )}
              </div>
            ) : null}
          </section>
        </>
      ) : <p><a href="/admin/ai">← All AI tools</a></p>}

      <section aria-labelledby="h-drafts">
        <h2 id="h-drafts">Recent drafts</h2>
        {drafts.length === 0 ? <p className="muted">No drafts yet.</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th scope="col">Draft</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Requested</th></tr></thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.id}>
                    <td><a href={`/admin/ai/${d.id}`}>{d.title}</a></td>
                    <td>{KIND_LABEL[d.kind] ?? d.kind}</td>
                    <td><span className={STATUS_LABEL[d.status]?.[1] ?? "badge"}>{STATUS_LABEL[d.status]?.[0] ?? d.status}</span></td>
                    <td className="nowrap">{date(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
