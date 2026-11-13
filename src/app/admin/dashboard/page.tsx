import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { companyHealthRows } from "../../../lib/reports/queries";
import { filterOptions, parseFilters } from "../../../lib/reports/analytics";
import { adminDashboard, type Section, type Table } from "../../../lib/reports/dashboard";
import { SubjectBarChart } from "../../../components/SubjectBarChart";
import { TrendChart } from "../../../components/TrendChart";
import { PrintButton } from "../../../components/PrintButton";

const PERIOD_LABEL = { all: "All time", week: "Last 7 days", month: "Last 30 days", year: "Last 12 months" } as const;

function DataTable({ id, table, query, empty }: { id: Section; table: Table; query: string; empty: string }) {
  return (
    <section aria-labelledby={`h-${id}`}>
      <h2 id={`h-${id}`}>{table.title}</h2>
      <p className="no-print"><a href={`/api/export/dashboard/${id}${query}`}>Download CSV (Excel)</a></p>
      {table.rows.length === 0 ? <p>{empty}</p> : (
        <table className="data">
          <thead><tr>{table.columns.map((c) => <th key={c} scope="col">{c.replace(/_/g, " ")}</th>)}</tr></thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i}>
                {table.columns.map((c) => <td key={c} className={typeof r[c] === "number" ? "num" : undefined}>{r[c] ?? "–"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const viewer = await guardPortal(["ADMIN"]);
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const query = (() => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v && !(k === "period" && v === "all")) q.set(k, String(v));
    const s = q.toString();
    return s ? `?${s}` : "";
  })();
  const [d, options, health] = await Promise.all([adminDashboard(viewer, filters), filterOptions(), companyHealthRows(viewer)]);
  const chart = d.certifications.rows.map((r) => ({ subject: String(r.subject), active: Number(r.active), expired: Number(r.expired) }));
  const described = [
    filters.level ? `level ${filters.level.toLowerCase()}` : null,
    filters.department ? `department ${filters.department}` : null,
    filters.location ? `location ${filters.location}` : null,
    PERIOD_LABEL[filters.period].toLowerCase(),
  ].filter(Boolean).join(", ");

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Dashboard</h1>
      <p>Showing: {described}. Counts include active users only. The period applies to issue, completion and submit dates; overdue work and the expiry forecast are as of today.</p>

      <form method="get" className="no-print" aria-label="Dashboard filters">
        <label>Level{" "}
          <select name="level" defaultValue={filters.level ?? ""}>
            <option value="">All levels</option>
            <option value="BASIC">Basic</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </label>{" "}
        <label>Department{" "}
          <select name="department" defaultValue={filters.department ?? ""}>
            <option value="">All departments</option>
            {options.departments.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>{" "}
        <label>Location{" "}
          <select name="location" defaultValue={filters.location ?? ""}>
            <option value="">All locations</option>
            {options.locations.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>{" "}
        <label>Period{" "}
          <select name="period" defaultValue={filters.period}>
            {Object.entries(PERIOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>{" "}
        <button type="submit">Apply filters</button>{" "}
        <a href="/admin/dashboard">Clear</a>{" "}
        <PrintButton />
      </form>

      <DataTable id="certifications" table={d.certifications} query={query} empty="No certifications match these filters." />
      {chart.length > 0 ? <SubjectBarChart data={chart} /> : null}
      <p className="no-print"><a href="/api/export/certifications">Download every certificate (CSV)</a></p>

      <DataTable id="completion-by-subject" table={d["completion-by-subject"]} query={query} empty="No one has started a course that matches." />
      <DataTable id="completion-by-course" table={d["completion-by-course"]} query={query} empty="No one has started a course that matches." />
      <DataTable id="completion-trend" table={d["completion-trend"]} query={query} empty="No completions yet." />
      <TrendChart data={d["completion-trend"].rows.map((r) => ({ month: String(r.month), completions: Number(r.completions) }))} />

      <DataTable id="assessments" table={d.assessments} query={query} empty="No submitted attempts match these filters." />
      <DataTable id="departments" table={d.departments} query={query} empty="No assigned assessments." />
      <DataTable id="top-performers" table={d["top-performers"]} query={query} empty="Not enough attempts yet (at least 2 per person)." />
      <DataTable id="needs-support" table={d["needs-support"]} query={query} empty="No one needs support right now." />
      <DataTable id="expiry-forecast" table={d["expiry-forecast"]} query={query} empty="No certificates expire in the next 90 days." />

      <section aria-labelledby="h-health">
        <h2 id="h-health">Company health</h2>
        <p className="no-print"><a href="/api/export/company-health">Download company health CSV</a></p>
        <table className="data">
          <thead><tr><th scope="col">Department</th><th scope="col">Attempts</th><th scope="col">Passed</th><th scope="col">Pass rate %</th><th scope="col">Overdue</th></tr></thead>
          <tbody>
            {(health ?? []).map((h) => (
              <tr key={h.department || "(none)"}>
                <td>{h.department || "(no department)"}</td><td className="num">{h.attempts}</td><td className="num">{h.passed}</td>
                <td className="num">{h.pass_rate_percent}</td><td className="num">{h.overdue_periods}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
