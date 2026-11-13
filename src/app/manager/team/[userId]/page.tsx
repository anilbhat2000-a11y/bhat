import { connection } from "next/server";
import { forbidden } from "next/navigation";
import { requireSession } from "../../../../lib/auth/current-user";
import { AuthError } from "../../../../lib/auth/guards";
import { memberDetail } from "../../../../lib/manager/team";
import { openRemedialsFor } from "../../../../lib/assessments/remedial";
import { commentRemedialAction } from "../../../actions/remedial";
import { LocalTime } from "../../../../components/LocalTime";

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await connection();
  const viewer = await requireSession();
  const { userId } = await params;
  const { notice, error } = await searchParams;
  let detail;
  try {
    detail = await memberDetail(viewer, userId);
  } catch (e) {
    if (e instanceof AuthError && e.status === 403) forbidden();
    throw e;
  }
  // memberDetail has checked the reporting line, so the plans can be read.
  const remedials = await openRemedialsFor(userId);

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>{detail.name}</h1>
      <p>{detail.email}{detail.department ? ` · ${detail.department}` : ""}</p>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <h2>Remedial plans</h2>
      {remedials.length === 0 ? <p>No open remedial plans.</p> : (
        <ul>
          {remedials.map((r) => (
            <li key={r.id} style={{ marginBottom: 12 }}>
              Failed {r.assessment}. {r.courseTitle ? `Review "${r.courseTitle}" (${r.courseDone ? "done" : "not done yet"}). ` : ""}
              Retake from <LocalTime iso={r.retakeAfter.toISOString()} />.
              {r.managerComment ? <><br />Your comment: {r.managerComment}</> : null}
              {viewer.id !== userId ? (
                <form action={commentRemedialAction}>
                  <input type="hidden" name="planId" value={r.id} />
                  <input type="hidden" name="userId" value={userId} />
                  <label>Approve or comment <input name="comment" maxLength={1000} size={50} defaultValue={r.managerComment ?? ""} required /></label>{" "}
                  <button type="submit">Save comment</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h2>Profile</h2>
      <h3>Skills (self-rated)</h3>
      <ul>{detail.profile.skills.map((s) => <li key={s.subject}>{s.subject}: {s.rating}/5</li>)}</ul>
      <h3>Languages</h3>
      <ul>{detail.profile.languages.map((l) => <li key={l.language}>{l.language}: {l.level.toLowerCase()}</li>)}</ul>
      <h3>Education</h3>
      <ul>{detail.profile.education.map((e, i) => <li key={i}>{e.qualification}, {e.institution}{e.fieldOfStudy ? ` (${e.fieldOfStudy})` : ""}</li>)}</ul>
      <h3>Work experience</h3>
      <ul>{detail.profile.experience.map((e, i) => <li key={i}>{e.jobTitle} at {e.company}, {e.startMonth} to {e.endMonth ?? "now"}</li>)}</ul>
      <h3>External certifications</h3>
      <ul>{detail.profile.externalCertifications.map((c, i) => <li key={i}>{c.name} ({c.issuingBody})</li>)}</ul>

      <h2>Course progress</h2>
      <ul>{detail.courses.map((c) => <li key={c.title}>{c.title}: {c.percent}%</li>)}</ul>

      <h2>Assessment attempts</h2>
      <ul>
        {detail.attempts.map((a, i) => (
          <li key={i}>
            {a.assessment} ({a.periodKey}): {a.status === "SUBMITTED" ? `${a.scorePercent}% ${a.passed ? "passed" : "not passed"}` : a.status.toLowerCase().replace("_", " ")}
            {a.proctorFlags > 0 ? ` · ${a.proctorFlags} proctoring flag${a.proctorFlags === 1 ? "" : "s"}` : ""}
          </li>
        ))}
      </ul>

      <h2>Certifications</h2>
      <ul>
        {detail.certifications.map((c, i) => (
          <li key={i}>{c.subject}, {c.level.toLowerCase()}: {c.active ? "active" : "expired"}</li>
        ))}
      </ul>

      <h2>Overdue</h2>
      <ul>{detail.overdue.map((o, i) => <li key={i}>{o.assessment} ({o.periodKey})</li>)}</ul>
    </main>
  );
}
