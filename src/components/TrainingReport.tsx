import Link from "next/link";
import type { EmployeeReport, TrainingFilters, TrainingStatus } from "../lib/reports/training";

const PAGE_SIZE = 25;
const STATUS_CLASS: Record<TrainingStatus, string> = {
  Completed: "tr-status tr-done",
  Overdue: "tr-status tr-overdue",
  "In progress": "tr-status tr-progress",
  "Not started": "tr-status tr-new",
};
const day = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "–");
const isoDay = (d?: Date) => (d ? new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10) : "");

function Bar({ percent, label }: { percent: number; label: string }) {
  return (
    <span className="tr-bar" role="img" aria-label={`${label}: ${percent}%`}>
      <span className="tr-bar-track"><span className="tr-bar-fill" style={{ width: `${percent}%` }} /></span>
      <span className="tr-bar-num">{percent}%</span>
    </span>
  );
}

// Employee-wise training report: the people in scope, each with the trainings assigned to
// them, the assignment period, what they completed, and their percentage of completion.
export function TrainingReport({ rows, all, filters, departments, page, basePath, exportHref, scopeNote }: {
  rows: EmployeeReport[];
  all: number;
  filters: TrainingFilters;
  departments: string[];
  page: number;
  basePath: string;
  exportHref: string;
  scopeNote: string;
}) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(pages, Math.max(1, page));
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const total = rows.reduce((t, e) => ({ assigned: t.assigned + e.assigned, completed: t.completed + e.completed, overdue: t.overdue + e.overdue, inProgress: t.inProgress + e.inProgress }), { assigned: 0, completed: 0, overdue: 0, inProgress: 0 });
  const overall = total.assigned === 0 ? 0 : Math.round((total.completed / total.assigned) * 100);
  const query = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | undefined> = { q: filters.q, department: filters.department, status: filters.status, from: isoDay(filters.from) || undefined, to: isoDay(filters.to) || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <p className="muted">{scopeNote} A training counts as completed when every lesson is done (and the completion check passed, where the course requires it). Percentages: <strong>Completed</strong> is trainings finished out of trainings assigned; <strong>Progress</strong> is the average of each training&apos;s lessons done.</p>

      <form method="get" className="toolbar no-print" aria-label="Filter the report">
        <label>Employee <input type="search" name="q" defaultValue={filters.q ?? ""} placeholder="Name or email" aria-label="Employee name or email" /></label>
        <label>Department
          <select name="department" defaultValue={filters.department ?? ""} aria-label="Department">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>Show
          <select name="status" defaultValue={filters.status ?? ""} aria-label="Show">
            <option value="">Everyone</option>
            <option value="overdue">With overdue trainings</option>
            <option value="incomplete">Not finished all trainings</option>
            <option value="complete">Finished all trainings</option>
            <option value="none">No trainings assigned</option>
          </select>
        </label>
        <fieldset className="tr-dates">
          <legend>Assigned between</legend>
          <input type="date" name="from" defaultValue={isoDay(filters.from)} aria-label="Assigned from" />
          <span aria-hidden="true">and</span>
          <input type="date" name="to" defaultValue={isoDay(filters.to)} aria-label="Assigned to" />
        </fieldset>
        <button type="submit">Apply</button>
        <a href={basePath} className="clear-link">Clear</a>
      </form>

      <section className="stat-row tr-stats" aria-label="Summary">
        <div><strong>{rows.length}</strong><span>Employees{rows.length !== all ? ` (of ${all})` : ""}</span></div>
        <div><strong>{total.assigned}</strong><span>Trainings assigned</span></div>
        <div><strong>{total.completed}</strong><span>Completed</span></div>
        <div><strong>{total.inProgress}</strong><span>In progress</span></div>
        <div className={total.overdue > 0 ? "stat-alert" : undefined}><strong>{total.overdue}</strong><span>Overdue</span></div>
        <div><strong>{overall}%</strong><span>Overall completion</span></div>
      </section>

      <p className="no-print"><a className="btn-outline" href={`${exportHref}${query({})}`} data-test="training-export">Download Excel report</a> <span className="muted">One sheet per employee summary, one with every training.</span></p>

      {rows.length === 0 ? <p className="muted">No employees match these filters.</p> : (
        <div className="tr-list" data-test="training-report">
          <div className="tr-head" aria-hidden="true">
            <span>Employee</span><span>Assigned</span><span>Completed</span><span>In progress</span><span>Overdue</span><span>Completion</span>
          </div>
          {shown.map((e) => (
            <details key={e.id} className="tr-emp" data-employee={e.email}>
              <summary>
                <span className="tr-who">
                  <strong>{e.name}</strong>
                  <span className="muted">{[e.jobTitle, e.department].filter(Boolean).join(" · ") || e.email}{e.manager ? ` · Manager: ${e.manager}` : ""}</span>
                </span>
                <span className="tr-num" data-label="Assigned">{e.assigned}</span>
                <span className="tr-num" data-label="Completed">{e.completed}</span>
                <span className="tr-num" data-label="In progress">{e.inProgress}</span>
                <span className={`tr-num${e.overdue > 0 ? " tr-red" : ""}`} data-label="Overdue">{e.overdue}</span>
                <span data-label="Completion">{e.assigned === 0 ? <span className="muted">No trainings</span> : <Bar percent={e.completionPercent} label={`${e.name} completion`} />}</span>
              </summary>
              {e.assigned === 0 ? <p className="muted tr-empty">No trainings are assigned to {e.name}.</p> : (
                <div className="table-wrap">
                  <table className="data tr-table">
                    <thead>
                      <tr>
                        <th scope="col">Training</th>
                        <th scope="col">Assigned through</th>
                        <th scope="col">Assignment period</th>
                        <th scope="col" className="num">Lessons done</th>
                        <th scope="col">Progress</th>
                        <th scope="col">Status</th>
                        <th scope="col">Completed on</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.trainings.map((t) => (
                        <tr key={t.courseId}>
                          <td><span className="tr-course">{t.course}</span><span className="muted tr-sub">{t.subject}</span></td>
                          <td>{t.assignedVia}</td>
                          <td className="tr-period"><span><span className="muted">From</span> {day(t.assignedAt)}</span><span><span className="muted">Due</span> {t.dueAt ? day(t.dueAt) : "no due date"}</span></td>
                          <td className="num">{t.lessonsDone} / {t.lessonsTotal}</td>
                          <td><Bar percent={t.percent} label={`${t.course} progress`} /></td>
                          <td><span className={STATUS_CLASS[t.status]}>{t.status}</span></td>
                          <td className="nowrap">{day(t.completedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="muted tr-foot">Average progress across these trainings: {e.progressPercent}%.</p>
                </div>
              )}
            </details>
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav className="pager no-print" aria-label="Pages">
          {current > 1 ? <Link href={`${basePath}${query({ page: String(current - 1) })}`}>← Previous</Link> : <span />}
          <span>Page {current} of {pages}</span>
          {current < pages ? <Link href={`${basePath}${query({ page: String(current + 1) })}`}>Next →</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
