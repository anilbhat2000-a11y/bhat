import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createAssessmentAction } from "../../actions/assessments";

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { error } = await searchParams;
  const [assessments, subjects, courses] = await Promise.all([
    prisma.assessment.findMany({ orderBy: { title: "asc" }, include: { subject: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: [{ subject: { name: "asc" } }, { title: "asc" }], select: { id: true, title: true, subject: { select: { name: true } } } }),
  ]);

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Assessments</h1>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {assessments.map((a) => (
          <li key={a.id}>
            <a href={`/admin/assessments/${a.id}`}>{a.title}</a> — {a.subject.name}, {a.cadence}, {a.published ? "Published" : "Draft"}
          </li>
        ))}
      </ul>
      <h2>New assessment</h2>
      <form data-test="create-assessment" action={createAssessmentAction}>
        <input aria-label="Title" name="title" placeholder="Title" required />{" "}
        <select aria-label="Subject" name="subjectId" required defaultValue="">
          <option value="" disabled>Choose a subject</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>{" "}
        <select aria-label="Cadence" name="cadence" defaultValue="ONE_TIME">
          <option value="ONE_TIME">One time</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="ANNUAL">Annual</option>
        </select>{" "}
        <select aria-label="Level" name="level" defaultValue="BASIC">
          <option value="BASIC">Basic</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>{" "}
        <input name="passMarkPercent" type="number" min={1} max={100} defaultValue={70} aria-label="Pass mark" />{" "}
        <input aria-label="Time limit (min, optional)" name="timeLimitMinutes" type="number" min={1} placeholder="Time limit (min, optional)" />{" "}
        <input aria-label="Questions per attempt (optional)" name="questionsPerAttempt" type="number" min={1} placeholder="Questions per attempt (optional)" />{" "}
        <label>Attempts per period <input aria-label="Max attempts per period" name="maxAttemptsPerPeriod" type="number" min={1} max={10} defaultValue={3} /></label>{" "}
        <label><input name="showAnswersAfterSubmit" type="checkbox" defaultChecked /> Show correct answers after submit</label>{" "}
        <label>Checks the course (optional, same subject){" "}
          <select name="courseId" defaultValue="">
            <option value="">No linked course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.subject.name}: {c.title}</option>)}
          </select>
        </label>{" "}
        <button type="submit">Create assessment</button>
      </form>
    </main>
  );
}
