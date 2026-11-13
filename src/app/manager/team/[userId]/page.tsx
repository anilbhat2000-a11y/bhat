import { connection } from "next/server";
import { forbidden } from "next/navigation";
import { requireSession } from "../../../../lib/auth/current-user";
import { AuthError } from "../../../../lib/auth/guards";
import { memberDetail } from "../../../../lib/manager/team";

export default async function MemberPage({ params }: { params: Promise<{ userId: string }> }) {
  await connection();
  const viewer = await requireSession();
  const { userId } = await params;
  let detail;
  try {
    detail = await memberDetail(viewer, userId);
  } catch (e) {
    if (e instanceof AuthError && e.status === 403) forbidden();
    throw e;
  }

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>{detail.name}</h1>
      <p>{detail.email}{detail.department ? ` · ${detail.department}` : ""}</p>

      <h2>Course progress</h2>
      <ul>{detail.courses.map((c) => <li key={c.title}>{c.title}: {c.percent}%</li>)}</ul>

      <h2>Assessment attempts</h2>
      <ul>
        {detail.attempts.map((a, i) => (
          <li key={i}>
            {a.assessment} ({a.periodKey}): {a.status === "SUBMITTED" ? `${a.scorePercent}% ${a.passed ? "passed" : "not passed"}` : a.status.toLowerCase()}
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
