import { connection } from "next/server";
import { requireSession } from "../../../lib/auth/current-user";
import { myCertifications } from "../../../lib/learning/certifications";

export default async function CertificationsPage() {
  await connection();
  const user = await requireSession();
  const rows = await myCertifications(user.id);
  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>My certifications</h1>
      {rows.length === 0 ? <p>No certifications yet.</p> : (
        <table>
          <thead><tr><th>Subject</th><th>Level</th><th>Issued</th><th>Expires</th><th>Status</th><th>Code</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.subject}</td>
                <td>{r.level.toLowerCase()}</td>
                <td>{r.issuedAt.toISOString().slice(0, 10)}</td>
                <td>{r.expiresAt.toISOString().slice(0, 10)}</td>
                <td>{r.active ? "Active" : "Expired: renew by passing the assessment again"}</td>
                <td>{r.verificationCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
