import { connection } from "next/server";
import { notFound } from "next/navigation";
import { guardPortal } from "../../../../lib/auth/portal";
import { prisma } from "../../../../lib/db/client";
import { getDraft } from "../../../../lib/ai/drafts";
import { KIND_LABEL, STATUS_LABEL } from "../../../../lib/ai/labels";
import type { AiQuestion, CourseDraft, LessonDraft, QuestionsDraft } from "../../../../lib/ai/content";
import { LessonText } from "../../../../components/LessonText";
import { applyDraftAction, discardDraftAction } from "../../../actions/ai";

const TYPE_LABEL: Record<AiQuestion["type"], string> = { SINGLE: "One correct answer", MULTIPLE: "Several correct answers", TRUE_FALSE: "True or false" };
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

function ReviewNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="card ai-notes" aria-labelledby="h-notes" data-test="ai-review-notes">
      <h2 id="h-notes">Check these before you apply</h2>
      <ul>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      <p className="muted">Also search the text for <code>[PLACEHOLDER</code> and replace each one with the company&apos;s real details.</p>
    </section>
  );
}

function QuestionEditor({ questions, readOnly }: { questions: AiQuestion[]; readOnly: boolean }) {
  return (
    <ol className="ai-questions">
      {questions.map((q, i) => (
        <li key={i} className="ai-question">
          <label><input type="checkbox" name={`q${i}-use`} defaultChecked disabled={readOnly} /> Use this question <span className="muted">({TYPE_LABEL[q.type]})</span></label>
          {q.scenario || !readOnly ? (
            <label>Situation (optional)<textarea name={`q${i}-scenario`} rows={2} defaultValue={q.scenario} readOnly={readOnly} aria-label={`Question ${i + 1} situation`} /></label>
          ) : null}
          <label>Question<textarea name={`q${i}-text`} rows={2} defaultValue={q.text} readOnly={readOnly} aria-label={`Question ${i + 1} text`} /></label>
          <div className="ai-two">
            <label>Options, one per line<textarea name={`q${i}-options`} rows={Math.max(2, q.options.length)} defaultValue={q.options.join("\n")} readOnly={readOnly || q.type === "TRUE_FALSE"} aria-label={`Question ${i + 1} options`} /></label>
            <label>Correct answers, one per line (copied from the options)<textarea name={`q${i}-correct`} rows={Math.max(2, q.correct.length)} defaultValue={q.correct.join("\n")} readOnly={readOnly} aria-label={`Question ${i + 1} correct answers`} /></label>
          </div>
          <label>Explanation shown after the attempt<textarea name={`q${i}-explanation`} rows={2} defaultValue={q.explanation} readOnly={readOnly} aria-label={`Question ${i + 1} explanation`} /></label>
        </li>
      ))}
    </ol>
  );
}

// Review an AI draft: read it, edit anything, untick what you do not want, then apply it.
export default async function AiDraftPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  const actor = await guardPortal(["ADMIN"]);
  const { id } = await params;
  const sp = await searchParams;
  const draft = await getDraft(actor, id);
  if (!draft) notFound();
  const request = (draft.request ?? {}) as Record<string, unknown>;
  const [status, badge] = STATUS_LABEL[draft.status] ?? [draft.status, "badge"];
  const readOnly = draft.status !== "READY";
  const [subjects, people, lesson, course] = await Promise.all([
    draft.kind === "COURSE" ? prisma.subject.findMany({ orderBy: { name: "asc" } }) : [],
    draft.kind === "COURSE" ? prisma.user.findMany({ where: { active: true }, select: { department: true } }) : [],
    draft.lessonId ? prisma.lesson.findUnique({ where: { id: draft.lessonId }, select: { id: true, title: true } }) : null,
    draft.courseId ? prisma.course.findUnique({ where: { id: draft.courseId }, select: { id: true, title: true } }) : null,
  ]);
  const departments = [...new Set(people.map((p) => p.department).filter((x): x is string => !!x))].sort();

  const head = (
    <>
      <p><a href="/admin/ai">← AI assistant</a></p>
      <h1>{KIND_LABEL[draft.kind] ?? draft.kind}: {draft.title}</h1>
      <p>
        <span className={badge} data-test="ai-draft-status">{status}</span>{" "}
        {course ? <span className="muted">Course: <a href={`/admin/courses/${course.id}`}>{course.title}</a>{lesson ? ` · Lesson: ${lesson.title}` : ""}</span> : null}
        {request.source ? <span className="muted"> · Reference file: {String(request.source)}</span> : null}
        {draft.model ? <span className="muted"> · Written by {draft.model}</span> : null}
      </p>
      {sp.error ? <p role="alert">{sp.error}</p> : null}
      {sp.notice ? <p role="status">{sp.notice}</p> : null}
    </>
  );

  if (draft.status === "GENERATING") {
    return (
      <main className="page">
        {/* Reloads every 5 seconds until the draft is written. */}
        <meta httpEquiv="refresh" content="5" />
        {head}
        <section className="card" aria-live="polite">
          <h2>The AI is writing…</h2>
          <p>{draft.kind === "COURSE" ? "A whole course takes two to five minutes." : "This usually takes under a minute."} This page refreshes by itself. You can leave it and come back from <a href="/admin/ai">Recent drafts</a>.</p>
        </section>
      </main>
    );
  }
  if (draft.status === "FAILED") {
    return (
      <main className="page">
        {head}
        <section className="card" role="alert">
          <h2>The draft could not be written</h2>
          <p>{draft.error}</p>
          <p><a className="btn-outline" href={draft.kind === "LESSON" && draft.lessonId ? `/admin/ai?lesson=${draft.lessonId}` : draft.kind === "QUESTIONS" && draft.courseId ? `/admin/ai?course=${draft.courseId}` : "/admin/ai"}>Try again</a></p>
        </section>
      </main>
    );
  }

  const actions = readOnly ? (
    <p className="muted">{draft.status === "APPLIED" ? `Applied on ${draft.appliedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. This is the text that was saved.` : "This draft was discarded."}</p>
  ) : (
    <div className="page-actions">
      <button type="submit" data-test="ai-apply">{draft.kind === "COURSE" ? "Create the course (unpublished)" : draft.kind === "LESSON" ? "Save over the lesson" : "Add ticked questions to the completion check"}</button>
    </div>
  );
  const discard = readOnly ? null : (
    <form action={discardDraftAction}>
      <input type="hidden" name="id" value={draft.id} />
      <button type="submit" className="btn-danger" data-test="ai-discard">Discard this draft</button>
    </form>
  );

  if (draft.kind === "LESSON") {
    const d = draft.result as LessonDraft;
    const before = (request.before ?? { title: "", body: "" }) as { title: string; body: string };
    return (
      <main className="page">
        {head}
        <ReviewNotes notes={d.reviewNotes} />
        {d.changes.length > 0 ? (
          <section className="card"><h2>What the AI changed</h2><ul>{d.changes.map((c, i) => <li key={i}>{c}</li>)}</ul></section>
        ) : null}
        <form action={applyDraftAction} className="card" data-test="ai-review">
          <input type="hidden" name="id" value={draft.id} />
          <label>Lesson title <input name="title" defaultValue={d.title} required readOnly={readOnly} aria-label="Lesson title" style={{ width: "100%" }} /></label>
          <label>New text ({wordCount(d.body)} words). Edit it here if needed.
            <textarea name="body" rows={28} defaultValue={d.body} required readOnly={readOnly} aria-label="Lesson text" className="ai-body" />
          </label>
          {actions}
        </form>
        <div className="ai-two">
          <details open><summary>Preview of the new text</summary><div className="card"><LessonText body={d.body} /></div></details>
          <details><summary>Text before the change ({wordCount(before.body)} words)</summary><div className="card"><LessonText body={before.body} /></div></details>
        </div>
        {discard}
      </main>
    );
  }

  if (draft.kind === "QUESTIONS") {
    const d = draft.result as QuestionsDraft;
    return (
      <main className="page">
        {head}
        <ReviewNotes notes={d.reviewNotes} />
        <form action={applyDraftAction} data-test="ai-review">
          <input type="hidden" name="id" value={draft.id} />
          <p>Untick any question you do not want, and correct the wording or answers if needed. A question whose correct answer does not exactly match one of its options is skipped.</p>
          <QuestionEditor questions={d.questions} readOnly={readOnly} />
          {actions}
        </form>
        {discard}
      </main>
    );
  }

  const d = draft.result as CourseDraft;
  const lessons = d.modules.reduce((n, m) => n + m.lessons.length, 0);
  return (
    <main className="page">
      {head}
      <p className="muted">{d.modules.length} modules, {lessons} lessons, {d.questions.length} questions. Read every lesson, fix anything wrong, untick what you do not want, then create the course. It is saved unpublished, so you can check it on the course page before learners see it.</p>
      <ReviewNotes notes={d.reviewNotes} />
      <form action={applyDraftAction} data-test="ai-review">
        <input type="hidden" name="id" value={draft.id} />
        <fieldset className="card">
          <legend>About the course</legend>
          <label>Course title <input name="title" defaultValue={d.title} required readOnly={readOnly} aria-label="Course title" style={{ width: "100%" }} /></label>
          <label>Description <textarea name="description" rows={2} defaultValue={d.description} readOnly={readOnly} aria-label="Description" style={{ width: "100%" }} /></label>
          <label>Subject{" "}
            <select name="subjectId" defaultValue={String(request.subjectId ?? "")} disabled={readOnly} aria-label="Subject">
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>{" "}
          <label>Level{" "}
            <select name="level" defaultValue={String(request.level ?? "BASIC")} disabled={readOnly} aria-label="Level">
              <option value="BASIC">Basic</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>
          <label>Departments (comma-separated; leave empty for everyone) <input name="departments" list="ai-departments" readOnly={readOnly} aria-label="Departments" style={{ width: "100%", maxWidth: 520 }} /></label>
          <datalist id="ai-departments">{departments.map((x) => <option key={x} value={x} />)}</datalist>
        </fieldset>

        {d.modules.map((m, mi) => (
          <fieldset key={mi} className="card ai-module">
            <legend>Module {mi + 1}</legend>
            <label>Module title <input name={`m${mi}-title`} defaultValue={m.title} readOnly={readOnly} aria-label={`Module ${mi + 1} title`} style={{ width: "100%", maxWidth: 520 }} /></label>{" "}
            <label>Minutes <input type="number" name={`m${mi}-minutes`} min={1} max={10000} defaultValue={m.estimatedMinutes} readOnly={readOnly} aria-label={`Module ${mi + 1} minutes`} /></label>
            {m.lessons.map((l, li) => (
              <details key={li} className="ai-lesson">
                <summary>Lesson {mi + 1}.{li + 1}: {l.title} <span className="muted">({wordCount(l.body)} words)</span></summary>
                <label><input type="checkbox" name={`m${mi}-l${li}-use`} defaultChecked disabled={readOnly} /> Include this lesson</label>
                <label>Lesson title <input name={`m${mi}-l${li}-title`} defaultValue={l.title} readOnly={readOnly} aria-label={`Lesson ${mi + 1}.${li + 1} title`} style={{ width: "100%" }} /></label>
                <div className="ai-two">
                  <label>Text<textarea name={`m${mi}-l${li}-body`} rows={24} defaultValue={l.body} readOnly={readOnly} aria-label={`Lesson ${mi + 1}.${li + 1} text`} className="ai-body" /></label>
                  <div><span className="muted">Preview</span><div className="card ai-preview"><LessonText body={l.body} /></div></div>
                </div>
              </details>
            ))}
          </fieldset>
        ))}

        {d.questions.length > 0 ? (
          <fieldset className="card">
            <legend>Completion check questions</legend>
            <QuestionEditor questions={d.questions} readOnly={readOnly} />
          </fieldset>
        ) : null}

        {d.sources.length > 0 ? (
          <fieldset className="card">
            <legend>Sources and further reading</legend>
            <p className="muted">Open each link to make sure it works and says what the course says. Untick any that do not.</p>
            {d.sources.map((s, i) => (
              <label key={i} style={{ display: "block" }}><input type="checkbox" name={`s${i}-use`} defaultChecked disabled={readOnly} /> {s.title}: <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a></label>
            ))}
          </fieldset>
        ) : null}
        {actions}
      </form>
      {discard}
    </main>
  );
}
