import { DURATIONS, type Duration, type certificateOverview } from "../lib/reports/lms-dashboard";
import { Illustration } from "./Illustration";

type Data = Awaited<ReturnType<typeof certificateOverview>>;
const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const level = (l: string) => l.charAt(0) + l.slice(1).toLowerCase();

// Certificate figures and a searchable list. Admins can download each certificate; managers
// can open its public verification page.
export function CertificatesView({ data, duration, q, canDownload }: { data: Data; duration: Duration; q: string; canDownload: boolean }) {
  return (
    <>
      <section aria-label="Certificate figures" className="stat-row">
        <div><strong>{data.stats.assignedCourses}</strong><span>Courses assigned</span></div>
        <div><strong>{data.stats.peopleAssigned}</strong><span>People with assigned courses</span></div>
        <div><strong>{data.stats.valid}</strong><span>Valid certificates</span></div>
        <div><strong>{data.stats.expiring}</strong><span>Expiring in the next 90 days</span></div>
      </section>

      <h2>Issued certificates</h2>
      <form method="get" aria-label="Search certificates" className="dash-duration" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <label>Period{" "}
          <select name="duration" defaultValue={duration} aria-label="Period">
            {DURATIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </label>{" "}
        <label>Search <input type="search" name="q" defaultValue={q} placeholder="Subject, person or department" aria-label="Search certificates" /></label>{" "}
        <button type="submit">Search</button>
      </form>

      {data.rows.length === 0 ? (
        <div className="dash-empty"><Illustration name="award" /><p>No certificates yet for this period{q ? " and search" : ""}. Certificates are issued automatically when people pass their annual assessments.</p></div>
      ) : (
        <table className="data">
          <thead><tr><th scope="col">Certificate</th><th scope="col">Holder</th><th scope="col">Department</th><th scope="col" aria-sort="descending">Issued on</th><th scope="col">Valid until</th><th scope="col">Status</th><th scope="col">Certificate</th></tr></thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.subject} ({level(r.level)})</td><td>{r.holder}</td><td>{r.department || "–"}</td>
                <td>{date(r.issuedAt)}</td><td>{date(r.expiresAt)}</td>
                <td>{r.valid ? <span className="badge badge-ok">Valid</span> : <span className="badge badge-off">Expired</span>}</td>
                <td>{canDownload ? <a href={`/api/certificates/${r.id}`}>Download PDF</a> : <a href={`/verify/${r.code}`}>Verify</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.total > data.rows.length ? <p><small>Showing the latest {data.rows.length} of {data.total}. Narrow the period or search.</small></p> : null}
    </>
  );
}
