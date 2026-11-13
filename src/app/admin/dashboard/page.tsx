import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { requireSession } from "../../../lib/auth/current-user";
import { prisma } from "../../../lib/db/client";
import { certificationRows, companyHealthRows } from "../../../lib/reports/queries";
import { certsBySubject, latestPerPerson } from "../../../lib/reports/aggregate";
import { SubjectBarChart } from "../../../components/SubjectBarChart";

export default async function AdminDashboard() {
  await connection();
  await guardPortal(["ADMIN"]);
  const viewer = await requireSession();
  const now = new Date();
  const [certs, health, overdue] = await Promise.all([
    certificationRows(viewer, now),
    companyHealthRows(viewer),
    prisma.assessmentPeriod.count({ where: { status: "OVERDUE" } }),
  ]);
  const subjects = certsBySubject(latestPerPerson(certs).map((c) => ({ subject: c.subject, level: c.level, expiresAt: c.expiresAt })), now);

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Dashboard</h1>
      <p>Overdue assessments across the company: {overdue}</p>
      <p><a href="/api/export/certifications">Download certifications CSV</a> · <a href="/api/export/company-health">Download company health CSV</a></p>

      <h2>Certifications by subject</h2>
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
      {subjects.length > 0 ? <SubjectBarChart data={subjects} /> : <p>No certifications issued yet.</p>}

      <h2>Company health</h2>
      <table>
        <thead><tr><th>Department</th><th>Attempts</th><th>Passed</th><th>Pass rate %</th><th>Overdue</th></tr></thead>
        <tbody>
          {(health ?? []).map((h) => (
            <tr key={h.department || "(none)"}>
              <td>{h.department || "(no department)"}</td><td>{h.attempts}</td><td>{h.passed}</td>
              <td>{h.pass_rate_percent}</td><td>{h.overdue_periods}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
