import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db/client";
import {
  addQuestionAction, importQuestionsAction, setAssignmentAction, setPublishedAction, resetAttemptsAction,
} from "../../../actions/assessments";

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { id } = await params;
  const { error, notice } = await searchParams;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { questions: { orderBy: { position: "asc" } }, assignments: true },
  });
  if (!assessment) notFound();
  const periods = await prisma.assessmentPeriod.findMany({
    where: { assessmentId: id },
    include: { user: { select: { name: true } } },
    orderBy: [{ periodKey: "desc" }, { dueAt: "asc" }],
    take: 200,
  });

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>{assessment.title}</h1>
      <p>Status: {assessment.published ? "Published" : "Draft"} · {assessment.cadence} · pass mark {assessment.passMarkPercent}%</p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}

      <form data-test="publish-assessment" action={setPublishedAction}>
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <input type="hidden" name="published" value={assessment.published ? "false" : "true"} />
        <button type="submit">{assessment.published ? "Unpublish" : "Publish"}</button>
      </form>

      <h2>Questions ({assessment.questions.length})</h2>
      <ol>
        {assessment.questions.map((q) => <li key={q.id}>{q.text} <small>({q.type}, {q.points} pts)</small></li>)}
      </ol>

      <h2>Add a question</h2>
      <form data-test="add-question" action={addQuestionAction}>
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <select aria-label="Type" name="type" defaultValue="SINGLE">
          <option value="SINGLE">Single choice</option>
          <option value="MULTIPLE">Multiple choice</option>
          <option value="TRUE_FALSE">True / false</option>
        </select>{" "}
        <input aria-label="Question" name="text" placeholder="Question" required />{" "}
        <input aria-label="Options, e.g. A|B|C" name="options" placeholder="Options, e.g. A|B|C" required />{" "}
        <input aria-label="Correct option number(s), e.g. 2" name="correct" placeholder="Correct option number(s), e.g. 2" required />{" "}
        <input name="points" type="number" min={1} defaultValue={1} aria-label="Points" />{" "}
        <button type="submit">Add question</button>
      </form>

      <h2>Import questions (CSV)</h2>
      <p>Columns: type, text, options, correct, points. Options and correct numbers are separated by |.</p>
      <form data-test="import-questions" action={importQuestionsAction}>
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <textarea aria-label="Csv" name="csv" rows={6} cols={80} required />
        <br />
        <button type="submit">Import</button>
      </form>

      <h2>Learner periods</h2>
      {periods.length === 0 ? <p>No one has an open period yet.</p> : (
        <ul>
          {periods.map((p) => (
            <li key={p.id}>
              {p.user.name}, {p.periodKey}: {p.status.toLowerCase()}{" "}
              {p.status !== "PASSED" ? (
                <form action={resetAttemptsAction} style={{ display: "inline" }}>
                  <input type="hidden" name="periodId" value={p.id} />
                  <button type="submit">Reset attempts</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h2>Assigned to</h2>
      <p>{assessment.assignments.map((a) => `${a.targetType}${a.targetValue ? `: ${a.targetValue}` : ""}`).join(", ") || "Nobody yet"}</p>
      <form action={setAssignmentAction}>
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <select aria-label="Target type" name="targetType" defaultValue="ALL">
          <option value="ALL">Everyone</option>
          <option value="DEPARTMENT">A department</option>
          <option value="USER">One user (by id)</option>
        </select>{" "}
        <input aria-label="Department name or user id" name="targetValue" placeholder="Department name or user id" />{" "}
        <button type="submit">Save assignment</button>
      </form>
    </main>
  );
}
