import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../lib/auth/current-user";
import { attemptForUser } from "../../../../lib/assessments/take";
import { submitAttemptAction } from "../../../actions/attempts";
import { AttemptTimer } from "../../../../components/AttemptTimer";

export default async function AttemptPage({
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
  const attempt = await attemptForUser(user, id);
  if (!attempt) notFound();

  if (attempt.status !== "IN_PROGRESS") {
    return (
      <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
        <h1>{attempt.title}</h1>
        {attempt.status === "SUBMITTED" ? (
          <>
            <p>Score: {attempt.scorePercent}%</p>
            <p>{attempt.passed ? "Passed" : "Not passed"}</p>
            {attempt.reviewerNote ? <p>Reviewer&apos;s note: {attempt.reviewerNote}</p> : null}
            {attempt.answerKey ? (
              <ol>
                {attempt.answerKey.map((a, i) => (
                  <li key={i} style={{ marginBottom: 12 }}>
                    {a.text}
                    <br />Your answer: {a.yourAnswer.length ? a.yourAnswer.join("; ") : "(no answer)"}
                    <br />Correct answer: {a.correct.join("; ")}
                    {a.explanation ? <><br />Explanation: {a.explanation}</> : null}
                    {a.reviewerNote ? <><br />Reviewer: {a.reviewerNote}</> : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        ) : attempt.status === "AWAITING_GRADING" ? (
          <p role="status">Submitted. Some answers are marked by a reviewer, so your score will appear here once they are graded.</p>
        ) : attempt.status === "VOIDED" ? (
          <p>This attempt was reset by an administrator and does not count.</p>
        ) : (
          <p>This attempt ran out of time and was not scored.</p>
        )}
        <a href="/learn/assessments">Back to my assessments</a>
      </main>
    );
  }

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>{attempt.title}</h1>
      {attempt.expiresAt ? <AttemptTimer formId="attempt-form" endsAtIso={attempt.expiresAt.toISOString()} /> : null}
      {error ? <p role="alert">{error}</p> : null}
      <form id="attempt-form" action={submitAttemptAction}>
        <input type="hidden" name="attemptId" value={id} />
        {attempt.questions.map((q, i) => (
          <fieldset key={q.id} style={{ marginBottom: 16 }}>
            <legend>{i + 1}. {q.text} ({q.points} pts){q.type === "MULTIPLE" ? " (select all that apply)" : ""}</legend>
            {q.scenario ? <p style={{ whiteSpace: "pre-wrap", borderLeft: "3px solid #888", paddingLeft: 8 }}><strong>Scenario:</strong> {q.scenario}</p> : null}
            {q.type === "FILL_BLANK" ? (
              <label>Your answer <input name={`q-${q.id}`} autoComplete="off" maxLength={200} /></label>
            ) : q.type === "SHORT_ANSWER" ? (
              <label>Your answer (marked by a reviewer)<br />
                <textarea name={`q-${q.id}`} rows={5} cols={60} maxLength={5000} />
              </label>
            ) : q.type === "MATCHING" ? (
              q.options.map((o) => (
                <label key={o.id} style={{ display: "block" }}>
                  {o.label}{" "}
                  <select name={`q-${q.id}`} defaultValue="" aria-label={`Match for ${o.label}`}>
                    <option value="" disabled>Choose a match</option>
                    {(q.choices ?? []).map((c) => <option key={c.id} value={`${o.id}=${c.id}`}>{c.label}</option>)}
                  </select>
                </label>
              ))
            ) : (
              q.options.map((o) => (
                <label key={o.id} style={{ display: "block" }}>
                  <input
                    type={q.type === "MULTIPLE" ? "checkbox" : "radio"}
                    name={`q-${q.id}`}
                    value={o.id}
                  />{" "}
                  {o.label}
                </label>
              ))
            )}
          </fieldset>
        ))}
        <button type="submit">Submit answers</button>
      </form>
    </main>
  );
}
