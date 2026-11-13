import { connection } from "next/server";
import { requireSession } from "../../../../lib/auth/current-user";
import { certificationRows } from "../../../../lib/reports/queries";
import { certsBySubject } from "../../../../lib/reports/aggregate";

export default async function TeamSummaryPage() {
  await connection();
  const viewer = await requireSession();
  const now = new Date();
  const rows = await certificationRows(viewer, now);
  const subjects = certsBySubject(rows.map((r) => ({ subject: r.subject, level: r.level, expiresAt: r.expiresAt })), now);

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Team certifications</h1>
      <p><a href="/api/export/team">Download team CSV</a></p>
      {subjects.length === 0 ? <p>Your team has no certifications yet.</p> : (
        <table>
          <thead><tr><th>Subject</th><th>Basic</th><th>Intermediate</th><th>Advanced</th><th>Active</th><th>Expired</th></tr></thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.subject}>
                <td>{s.subject}</td><td>{s.byLevel.BASIC}</td><td>{s.byLevel.INTERMEDIATE}</td><td>{s.byLevel.ADVANCED}</td>
                <td>{s.active}</td><td>{s.expired}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
