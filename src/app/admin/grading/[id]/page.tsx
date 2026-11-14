import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPortal } from "../../../../lib/auth/portal";
import { attemptForGrading } from "../../../../lib/assessments/grading";
import { gradeAttemptAction } from "../../../actions/grading";

export default async function GradeAttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const actor = await guardPortal(["ADMIN"]);
  const { id } = await params;
  const { error } = await searchParams;
  const view = await attemptForGrading(actor, id);
  if (!view) notFound();
  const open = view.status === "AWAITING_GRADING" && !view.ownAttempt;

  return (
    <main className="page">
      <h1>Grade: {view.assessment}</h1>
      <p>Learner: {view.learner} · Pass mark {view.passMarkPercent}%</p>
      {error ? <p role="alert">{error}</p> : null}
      {view.ownAttempt ? <p role="alert">This is your own attempt. Another reviewer must grade it.</p> : null}
      {view.status !== "AWAITING_GRADING" ? <p role="status">This attempt has already been graded.</p> : null}

      <form action={gradeAttemptAction}>
        <input type="hidden" name="attemptId" value={view.id} />
        <ol>
          {view.items.map((item) => (
            <li key={item.id} style={{ marginBottom: 16 }}>
              {item.scenario ? <p style={{ whiteSpace: "pre-wrap" }}><strong>Scenario:</strong> {item.scenario}</p> : null}
              <p><strong>{item.text}</strong> ({item.points} pts)</p>
              <p style={{ whiteSpace: "pre-wrap" }}>Answer: {item.answer.length ? item.answer.join("; ") : "(no answer)"}</p>
              {item.manual ? (
                <>
                  {item.modelAnswer ? <p style={{ whiteSpace: "pre-wrap" }}>Model answer: {item.modelAnswer}</p> : null}
                  <label>Mark (0 to {item.points}){" "}
                    <input name={`points-${item.id}`} type="number" min={0} max={item.points} step={1} required disabled={!open} />
                  </label>{" "}
                  <label>Note to the learner{" "}
                    <input name={`note-${item.id}`} maxLength={1000} size={50} disabled={!open} />
                  </label>
                </>
              ) : (
                <p>Marked automatically: {item.correct ? "correct" : "incorrect"} (expected {item.expected.join("; ")})</p>
              )}
            </li>
          ))}
        </ol>
        <label>Overall note (optional)<br />
          <textarea name="reviewerNote" rows={3} cols={60} maxLength={2000} disabled={!open} />
        </label>
        <br />
        {open ? <button type="submit">Save grades</button> : null}
      </form>
      <p><Link href="/admin/grading">Back to the grading queue</Link></p>
    </main>
  );
}
