import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../lib/auth/current-user";
import { attemptForUser } from "../../../../lib/assessments/take";
import { submitAttemptAction } from "../../../actions/attempts";

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
          </>
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
      {attempt.expiresAt ? <p>Time limit ends at {attempt.expiresAt.toISOString()}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <form action={submitAttemptAction}>
        <input type="hidden" name="attemptId" value={id} />
        {attempt.questions.map((q, i) => (
          <fieldset key={q.id} style={{ marginBottom: 16 }}>
            <legend>{i + 1}. {q.text} ({q.points} pts)</legend>
            {q.options.map((o) => (
              <label key={o.id} style={{ display: "block" }}>
                <input
                  type={q.type === "MULTIPLE" ? "checkbox" : "radio"}
                  name={`q-${q.id}`}
                  value={o.id}
                />{" "}
                {o.label}
              </label>
            ))}
          </fieldset>
        ))}
        <button type="submit">Submit answers</button>
      </form>
    </main>
  );
}
