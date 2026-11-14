import { connection } from "next/server";
import { requireSession } from "../../../../lib/auth/current-user";
import { certificationRows } from "../../../../lib/reports/queries";
import { certsBySubject, latestPerPerson } from "../../../../lib/reports/aggregate";
import { teamCompletion } from "../../../../lib/manager/team";
import { heatMap, loadRows, type HeatCell } from "../../../../lib/reports/analytics";
import { PrintButton } from "../../../../components/PrintButton";

export default async function TeamSummaryPage() {
  await connection();
  const viewer = await requireSession();
  const now = new Date();
  const rows = await certificationRows(viewer, now);
  const completion = await teamCompletion(viewer);
  // The team: the reporting line, without the manager themself.
  const all = await loadRows(viewer);
  const team = { ...all, users: all.users.filter((u) => u.id !== viewer.id) };
  const heatSubjects = [...new Set([...team.courses.map((c) => c.subject), ...team.certs.map((c) => c.subject)])].sort();
  const heat = heatMap(team, heatSubjects, now);
  const shown = heatSubjects.filter((s) => heat.some((r) => r.cells[s] !== "Not started"));
  const subjects = certsBySubject(latestPerPerson(rows).map((r) => ({ subject: r.subject, level: r.level, expiresAt: r.expiresAt })), now);

  return (
    <main className="page">
      <h1>Team certifications</h1>
      <p className="no-print"><a href="/api/export/team">Download team CSV</a> <PrintButton /></p>

      <h2>Subject heat map</h2>
      <p>Each cell shows where a team member stands in a subject: certified, weak (failed and not yet passed), in progress, or not started. Subjects nobody has started are left out.</p>
      {heat.length === 0 || shown.length === 0 ? <p>No activity in your team yet.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr><th scope="col">Member</th>{shown.map((s) => <th key={s} scope="col">{s}</th>)}</tr>
            </thead>
            <tbody>
              {heat.map((r) => (
                <tr key={r.userId}>
                  <th scope="row"><a href={`/manager/team/${r.userId}`}>{r.name}</a></th>
                  {shown.map((s) => <td key={s} className={`heat-${(r.cells[s] as HeatCell).replace(" ", "-")}`}>{r.cells[s]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2>Course completion</h2>
      <table className="data">
        <thead><tr><th>Member</th><th>Courses completed</th><th>Completion</th></tr></thead>
        <tbody>
          {completion.map((c) => (
            <tr key={c.id}><td>{c.name}</td><td>{c.completed} of {c.published}</td><td>{c.percent}%</td></tr>
          ))}
        </tbody>
      </table>
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
