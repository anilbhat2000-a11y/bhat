import { connection } from "next/server";
import Link from "next/link";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createAssessmentAction, togglePublishedFromListAction } from "../../actions/assessments";
import { AssessmentAssignPanel } from "../../../components/AssessmentAssignPanel";
import type { Cadence, Level, Prisma } from "../../../generated/prisma/client";

type Search = { q?: string; status?: string; cadence?: string; subject?: string; sort?: string; dir?: string; page?: string; assign?: string; error?: string; notice?: string };
const CADENCE_LABEL: Record<Cadence, string> = { ONE_TIME: "One time", WEEKLY: "Weekly", MONTHLY: "Monthly", ANNUAL: "Annual" };
const LEVEL_LABEL: Record<Level, string> = { BASIC: "Basic", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };
const SORTS = ["title", "subject", "cadence", "questions", "assigned", "passed"] as const;
type Sort = (typeof SORTS)[number];
const PAGE_SIZE = 25;

// The admin assessments list: every assessment in one searchable, sortable table, with
// Assign (employees, departments or everyone), Open and Publish on each row.
export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = sp.status === "published" || sp.status === "draft" ? sp.status : undefined;
  const cadence = (["ONE_TIME", "WEEKLY", "MONTHLY", "ANNUAL"] as const).find((c) => c === sp.cadence);
  const sort: Sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as Sort) : "title";
  const dir = sp.dir === "desc" ? "desc" : "asc";

  const where: Prisma.AssessmentWhereInput = {
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { course: { title: { contains: q, mode: "insensitive" } } }] } : {}),
    ...(status ? { published: status === "published" } : {}),
    ...(cadence ? { cadence } : {}),
    ...(sp.subject ? { subjectId: sp.subject } : {}),
  };
  const [all, subjects, courses, counts, periods, users] = await Promise.all([
    prisma.assessment.findMany({ where, include: { subject: true, course: { select: { id: true, title: true } }, assignments: true, _count: { select: { questions: true } } } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: [{ subject: { name: "asc" } }, { title: "asc" }], select: { id: true, title: true, subject: { select: { name: true } } } }),
    prisma.assessment.groupBy({ by: ["published"], _count: { _all: true } }),
    prisma.assessmentPeriod.groupBy({ by: ["assessmentId", "status"], where: { user: { active: true } }, _count: { _all: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, department: true } }),
  ]);
  const periodCount = (id: string, s?: string) => periods.filter((p) => p.assessmentId === id && (!s || p.status === s)).reduce((n, p) => n + p._count._all, 0);
  const coveredCount = (a: (typeof all)[number]) => {
    if (a.assignments.some((t) => t.targetType === "ALL")) return users.length;
    const ids = new Set<string>();
    for (const t of a.assignments) {
      if (t.targetType === "USER" && t.targetValue) ids.add(t.targetValue);
      if (t.targetType === "DEPARTMENT") for (const u of users) if (u.department === t.targetValue) ids.add(u.id);
    }
    return [...ids].filter((id) => users.some((u) => u.id === id)).length;
  };
  const assignedText = (a: (typeof all)[number]) => {
    if (a.assignments.length === 0) return null;
    if (a.assignments.some((t) => t.targetType === "ALL")) return "Everyone";
    const depts = a.assignments.filter((t) => t.targetType === "DEPARTMENT").length;
    const people = a.assignments.filter((t) => t.targetType === "USER").length;
    return [depts ? `${depts} department${depts === 1 ? "" : "s"}` : "", people ? `${people} ${people === 1 ? "person" : "people"}` : ""].filter(Boolean).join(", ");
  };
  const total = (p?: boolean) => counts.filter((c) => p === undefined || c.published === p).reduce((n, c) => n + c._count._all, 0);
  const overdueAll = periods.filter((p) => p.status === "OVERDUE").reduce((n, p) => n + p._count._all, 0);
  const openAll = periods.filter((p) => p.status === "OPEN").reduce((n, p) => n + p._count._all, 0);
  const passedAll = periods.filter((p) => p.status === "PASSED").reduce((n, p) => n + p._count._all, 0);

  const CAD_ORDER = { ONE_TIME: 0, WEEKLY: 1, MONTHLY: 2, ANNUAL: 3 };
  const key = (a: (typeof all)[number]): string | number =>
    sort === "subject" ? a.subject.name.toLowerCase() : sort === "cadence" ? CAD_ORDER[a.cadence] : sort === "questions" ? a._count.questions
      : sort === "assigned" ? coveredCount(a) : sort === "passed" ? periodCount(a.id, "PASSED") : a.title.toLowerCase();
  const sorted = [...all].sort((x, y) => {
    const a = key(x), b = key(y);
    const r = a < b ? -1 : a > b ? 1 : x.title.localeCompare(y.title);
    return dir === "asc" ? r : -r;
  });
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const assigning = sp.assign ? all.find((a) => a.id === sp.assign) ?? (await prisma.assessment.findUnique({ where: { id: sp.assign }, select: { id: true } })) : null;

  const link = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged: Partial<Search> = { q, status, cadence, subject: sp.subject, sort, dir, page: String(page), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === "1") && !(k === "sort" && v === "title") && !(k === "dir" && v === "asc")) p.set(k, v);
    const s = p.toString();
    return `/admin/assessments${s ? `?${s}` : ""}`;
  };
  const SortHeader = ({ col, label, num }: { col: Sort; label: string; num?: boolean }) => (
    <th scope="col" className={num ? "num" : undefined} aria-sort={sort === col ? (dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link href={link({ sort: col, dir: sort === col && dir === "asc" ? "desc" : "asc", page: "1" })} className="sort-link">{label}{sort === col ? (dir === "asc" ? " ▲" : " ▼") : ""}</Link>
    </th>
  );
  const here = link({});

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Assessments</h1>
          <p className="muted">Every test in the portal. <strong>Assign</strong> gives an assessment to chosen employees, whole departments or everyone; <strong>Open</strong> shows its questions, settings and each person&apos;s results.</p>
        </div>
        <div className="page-actions"><a className="btn" href="#new-assessment">New assessment</a></div>
      </div>
      {sp.error ? <p role="alert">{sp.error}</p> : null}
      {sp.notice ? <p role="status">{sp.notice}</p> : null}

      <section className="stat-row tr-stats" aria-label="Summary">
        <div><strong>{total()}</strong><span>Assessments</span></div>
        <div><strong>{total(true)}</strong><span>Published</span></div>
        <div><strong>{total(false)}</strong><span>Drafts</span></div>
        <div><strong>{openAll}</strong><span>Waiting to be taken</span></div>
        <div><strong>{passedAll}</strong><span>Passed</span></div>
        <div className={overdueAll > 0 ? "stat-alert" : undefined}><strong>{overdueAll}</strong><span>Overdue</span></div>
      </section>

      {assigning ? <AssessmentAssignPanel assessmentId={assigning.id} returnTo={`${link({ assign: assigning.id })}`} cancelHref={here} /> : null}

      <nav className="status-chips" aria-label="Filter by status">
        <Link href={link({ status: undefined, page: "1" })} aria-current={!status ? "page" : undefined}>All <span>{total()}</span></Link>
        <Link href={link({ status: "published", page: "1" })} aria-current={status === "published" ? "page" : undefined}>Published <span>{total(true)}</span></Link>
        <Link href={link({ status: "draft", page: "1" })} aria-current={status === "draft" ? "page" : undefined}>Drafts <span>{total(false)}</span></Link>
      </nav>
      <form method="get" className="toolbar" aria-label="Search and filter assessments">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label>Search <input type="search" name="q" defaultValue={q} placeholder="Assessment or course title" aria-label="Search assessments" /></label>
        <label>Subject area
          <select name="subject" defaultValue={sp.subject ?? ""} aria-label="Subject area">
            <option value="">All subject areas</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>Frequency
          <select name="cadence" defaultValue={cadence ?? ""} aria-label="Frequency">
            <option value="">Any</option>
            {(Object.keys(CADENCE_LABEL) as Cadence[]).map((c) => <option key={c} value={c}>{CADENCE_LABEL[c]}</option>)}
          </select>
        </label>
        <button type="submit">Apply</button>
        <a href="/admin/assessments" className="clear-link">Clear</a>
      </form>

      <p className="muted" aria-live="polite">{sorted.length === 0 ? "No assessments match." : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length} assessments`}</p>

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="data assess-table" data-test="assessments-table">
            <thead>
              <tr>
                <SortHeader col="title" label="Assessment" />
                <SortHeader col="subject" label="Subject area" />
                <SortHeader col="cadence" label="Frequency" />
                <SortHeader col="questions" label="Questions" num />
                <SortHeader col="assigned" label="Assigned" num />
                <SortHeader col="passed" label="Results" />
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const covered = coveredCount(a);
                const passed = periodCount(a.id, "PASSED");
                const open = periodCount(a.id, "OPEN");
                const overdue = periodCount(a.id, "OVERDUE");
                const who = assignedText(a);
                return (
                  <tr key={a.id} className={assigning?.id === a.id ? "row-current" : undefined}>
                    <td className="course-cell">
                      <a href={`/admin/assessments/${a.id}`} id={`a-${a.id}`} className="course-title">{a.title}</a>
                      <span className="course-desc">
                        {LEVEL_LABEL[a.level]} · pass mark {a.passMarkPercent}%{a.timeLimitMinutes ? ` · ${a.timeLimitMinutes} min` : ""}{a.proctored ? " · proctored" : ""}
                        {a.course ? <> · checks <a href={`/admin/courses/${a.course.id}`}>{a.course.title}</a></> : null}
                      </span>
                    </td>
                    <td>{a.subject.name}</td>
                    <td><span className={`cad cad-${a.cadence.toLowerCase()}`}>{CADENCE_LABEL[a.cadence]}</span></td>
                    <td className="num">{a._count.questions === 0 ? <span className="tr-red" title="Add questions before publishing">0</span> : a._count.questions}</td>
                    <td className="num">
                      <span className="assigned-n">{covered}</span>
                      <span className="th-sub">{who ?? "Not assigned"}</span>
                    </td>
                    <td className="nowrap"><span className="results-cell">
                      {passed + open + overdue === 0 ? <span className="muted">–</span> : (
                        <>
                          <span className="res res-pass" title="Passed">✓ {passed}</span>
                          <span className="res res-open" title="Waiting to be taken">● {open}</span>
                          {overdue > 0 ? <span className="res res-late" title="Overdue">! {overdue}</span> : null}
                        </>
                      )}
                    </span></td>
                    <td><span className={a.published ? "badge badge-ok" : "badge badge-draft"}>{a.published ? "Published" : "Draft"}</span></td>
                    <td>
                      <div className="row-actions">
                        <a href={`${link({ assign: a.id })}#assign`} className="act act-assign" aria-describedby={`a-${a.id}`} data-test="assign-link">Assign</a>
                        <a href={`/admin/assessments/${a.id}`} className="act act-edit" aria-describedby={`a-${a.id}`}>Open</a>
                        <form action={togglePublishedFromListAction} className="inline-form">
                          <input type="hidden" name="assessmentId" value={a.id} />
                          <input type="hidden" name="published" value={a.published ? "false" : "true"} />
                          <input type="hidden" name="returnTo" value={here} />
                          <button type="submit" className={a.published ? "act act-quiet" : "act act-modify"} aria-describedby={`a-${a.id}`}>{a.published ? "Unpublish" : "Publish"}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="muted small-note">Results: ✓ passed · ● waiting to be taken · ! overdue (current and past periods, active employees).</p>

      {pages > 1 ? (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link href={link({ page: String(page - 1) })}>← Previous</Link> : <span />}
          <span>Page {page} of {pages}</span>
          {page < pages ? <Link href={link({ page: String(page + 1) })}>Next →</Link> : <span />}
        </nav>
      ) : null}

      <section id="new-assessment" aria-labelledby="h-new" className="card">
        <h2 id="h-new">New assessment</h2>
        <p className="muted">Creates a draft. Add questions on the next page, then publish and assign it.</p>
        <form data-test="create-assessment" action={createAssessmentAction} className="assess-new">
          <label className="field span-2"><span className="field-label">Title</span><input aria-label="Title" name="title" placeholder="For example: Networking fundamentals check" required /></label>
          <label className="field"><span className="field-label">Subject area</span>
            <select aria-label="Subject" name="subjectId" required defaultValue="">
              <option value="" disabled>Choose a subject area</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="field"><span className="field-label">Frequency</span>
            <select aria-label="Cadence" name="cadence" defaultValue="ONE_TIME">
              <option value="ONE_TIME">One time</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual (proctored)</option>
            </select>
          </label>
          <label className="field"><span className="field-label">Level</span>
            <select aria-label="Level" name="level" defaultValue="BASIC">
              <option value="BASIC">Basic</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>
          <label className="field"><span className="field-label">Pass mark (%)</span><input name="passMarkPercent" type="number" min={1} max={100} defaultValue={70} aria-label="Pass mark" /></label>
          <label className="field"><span className="field-label">Time limit (minutes)</span><input aria-label="Time limit (min, optional)" name="timeLimitMinutes" type="number" min={1} placeholder="No limit" /></label>
          <label className="field"><span className="field-label">Questions per attempt</span><input aria-label="Questions per attempt (optional)" name="questionsPerAttempt" type="number" min={1} placeholder="All questions" /></label>
          <label className="field"><span className="field-label">Attempts per period</span><input aria-label="Max attempts per period" name="maxAttemptsPerPeriod" type="number" min={1} max={10} defaultValue={3} /></label>
          <label className="field span-2"><span className="field-label">Checks the course (optional, same subject area)</span>
            <select name="courseId" defaultValue="" aria-label="Linked course">
              <option value="">No linked course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.subject.name}: {c.title}</option>)}
            </select>
          </label>
          <label className="span-2"><input name="showAnswersAfterSubmit" type="checkbox" defaultChecked /> Show correct answers after submit</label>
          <div className="form-actions span-all"><button type="submit" className="btn-primary">Create assessment</button></div>
        </form>
      </section>
    </main>
  );
}
