import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db/client";
import {
  addQuestionAction, importQuestionsAction, setAssignmentAction, setPublishedAction, resetAttemptsAction,
} from "../../../actions/assessments";
import { deleteQuestionAction, updateSettingsAction } from "../../../actions/content";

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
  const people = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, department: true }, orderBy: { name: "asc" } });
  const departments = [...new Set(people.map((p) => p.department).filter((d): d is string => Boolean(d)))].sort();
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
        {assessment.questions.map((q) => (
          <li key={q.id}>
            {q.text} <small>({q.type}, {q.points} pts)</small>{" "}
            <form action={deleteQuestionAction} style={{ display: "inline" }}>
              <input type="hidden" name="questionId" value={q.id} />
              <button type="submit">Delete question</button>
            </form>
          </li>
        ))}
      </ol>

      <h2>Settings</h2>
      <form action={updateSettingsAction}>
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <label>Pass mark <input name="passMarkPercent" type="number" min={1} max={100} defaultValue={assessment.passMarkPercent} /></label>{" "}
        <label>Attempts per period <input name="maxAttemptsPerPeriod" type="number" min={1} max={10} defaultValue={assessment.maxAttemptsPerPeriod} /></label>{" "}
        <label>Time limit (minutes) <input name="timeLimitMinutes" type="number" min={1} defaultValue={assessment.timeLimitMinutes ?? ""} /></label>{" "}
        <label>Questions per attempt <input name="questionsPerAttempt" type="number" min={1} defaultValue={assessment.questionsPerAttempt ?? ""} /></label>{" "}
        <label><input name="showAnswersAfterSubmit" type="checkbox" defaultChecked={assessment.showAnswersAfterSubmit} /> Show correct answers after submit</label>{" "}
        <button type="submit">Save settings</button>
      </form>

      <h2>Add a question</h2>
      <details>
        <summary>How to fill in each question type</summary>
        <ul>
          <li><strong>Single, multiple, true/false:</strong> options separated by |, and the correct option number(s), for example 2 or 1|3. True/false options are exactly True|False.</li>
          <li><strong>Fill in the blank:</strong> write ____ in the question; options are every accepted answer, separated by |. Leave correct empty.</li>
          <li><strong>Matching:</strong> options are pairs written left=right, separated by |, for example Switch=Layer 2|Router=Layer 3. Leave correct empty.</li>
          <li><strong>Short answer:</strong> no options and no correct number. Put a model answer in the explanation; a reviewer marks it in the grading queue.</li>
          <li><strong>Scenario-based:</strong> any type, with the case study in the scenario box.</li>
        </ul>
      </details>
      <form data-test="add-question" action={addQuestionAction}>
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <select aria-label="Type" name="type" defaultValue="SINGLE">
          <option value="SINGLE">Single choice</option>
          <option value="MULTIPLE">Multiple choice</option>
          <option value="TRUE_FALSE">True / false</option>
          <option value="FILL_BLANK">Fill in the blank</option>
          <option value="MATCHING">Matching</option>
          <option value="SHORT_ANSWER">Short answer (manually graded)</option>
        </select>{" "}
        <input aria-label="Question" name="text" placeholder="Question" required />{" "}
        <input aria-label="Options, e.g. A|B|C" name="options" placeholder="Options, e.g. A|B|C" />{" "}
        <input aria-label="Correct option number(s), e.g. 2" name="correct" placeholder="Correct option number(s), e.g. 2" />{" "}
        <input name="points" type="number" min={1} defaultValue={1} aria-label="Points" />
        <br />
        <textarea aria-label="Scenario (optional)" name="scenario" rows={2} cols={60} placeholder="Scenario or case study (optional)" />{" "}
        <textarea aria-label="Explanation (optional)" name="explanation" rows={2} cols={60} placeholder="Explanation shown after submit, or model answer for reviewers (optional)" />
        <br />
        <button type="submit">Add question</button>
      </form>

      <h2>Import questions (CSV)</h2>
      <p>Columns: type, text, options, correct, points, and optionally scenario and explanation. Options and correct numbers are separated by |. Types: SINGLE, MULTIPLE, TRUE_FALSE, FILL_BLANK, MATCHING, SHORT_ANSWER.</p>
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
        <input aria-label="Department name or user id" name="targetValue" placeholder="Department name or user id" list="assign-targets" />{" "}
        <datalist id="assign-targets">
          {departments.map((d) => <option key={`d-${d}`} value={d} />)}
          {people.map((p) => <option key={`u-${p.id}`} value={p.id} label={p.name} />)}
        </datalist>{" "}
        <button type="submit">Save assignment</button>
      </form>
    </main>
  );
}
