import { connection } from "next/server";
import Link from "next/link";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createCourseAction } from "../../actions/courses";
import type { CourseStatus, Level, Prisma } from "../../../generated/prisma/client";

type Search = { q?: string; subject?: string; level?: string; status?: string; department?: string; sort?: string; dir?: string; page?: string; error?: string; notice?: string };

const STATUS_LABEL: Record<CourseStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };
const STATUS_BADGE: Record<CourseStatus, string> = { DRAFT: "badge badge-draft", PUBLISHED: "badge badge-ok", ARCHIVED: "badge badge-archived" };
const LEVEL_LABEL: Record<Level, string> = { BASIC: "Basic", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };
const SORTS = ["title", "subject", "level", "status", "updated", "learners"] as const;
type Sort = (typeof SORTS)[number];
const PAGE_SIZE = 25;
const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

// The admin course catalogue: every course in one searchable, sortable table, with Edit
// (lessons and modules), Modify (details and status) and Delete on each row.
export default async function CoursesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = (["DRAFT", "PUBLISHED", "ARCHIVED"] as const).find((s) => s === sp.status);
  const level = (["BASIC", "INTERMEDIATE", "ADVANCED"] as const).find((l) => l === sp.level);
  const sort: Sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as Sort) : "title";
  const dir = sp.dir === "desc" ? "desc" : "asc";

  const where: Prisma.CourseWhereInput = {
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
    ...(sp.subject ? { subjectId: sp.subject } : {}),
    ...(level ? { level } : {}),
    ...(status ? { status } : {}),
    ...(sp.department === "__all" ? { departments: { isEmpty: true } } : sp.department ? { departments: { has: sp.department } } : {}),
  };
  const [all, subjects, people, counts, started, completed] = await Promise.all([
    prisma.course.findMany({ where, include: { subject: true, _count: { select: { lessons: true } } } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { department: true } }),
    prisma.course.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.courseProgress.groupBy({ by: ["courseId"], _count: { _all: true } }),
    prisma.courseProgress.groupBy({ by: ["courseId"], where: { completedAt: { not: null } }, _count: { _all: true } }),
  ]);
  const startedBy = new Map(started.map((s) => [s.courseId, s._count._all]));
  const completedBy = new Map(completed.map((s) => [s.courseId, s._count._all]));
  const total = (s?: CourseStatus) => counts.filter((c) => !s || c.status === s).reduce((n, c) => n + c._count._all, 0);
  const departments = [...new Set([...people.map((p) => p.department), ...all.flatMap((c) => c.departments)].filter((x): x is string => !!x))].sort();

  const LEVEL_ORDER = { BASIC: 1, INTERMEDIATE: 2, ADVANCED: 3 };
  const key = (c: (typeof all)[number]): string | number =>
    sort === "subject" ? c.subject.name.toLowerCase() : sort === "level" ? LEVEL_ORDER[c.level] : sort === "status" ? c.status
      : sort === "updated" ? c.updatedAt.getTime() : sort === "learners" ? startedBy.get(c.id) ?? 0 : c.title.toLowerCase();
  const sorted = [...all].sort((a, b) => {
    const x = key(a), y = key(b);
    const r = x < y ? -1 : x > y ? 1 : a.title.localeCompare(b.title);
    return dir === "asc" ? r : -r;
  });
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const link = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged = { q, subject: sp.subject, level, status, department: sp.department, sort, dir, page: String(page), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === "1") && !(k === "sort" && v === "title") && !(k === "dir" && v === "asc")) p.set(k, v);
    const s = p.toString();
    return `/admin/courses${s ? `?${s}` : ""}`;
  };
  const SortHeader = ({ col, label }: { col: Sort; label: string }) => (
    <th scope="col" aria-sort={sort === col ? (dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link href={link({ sort: col, dir: sort === col && dir === "asc" ? "desc" : "asc", page: "1" })} className="sort-link">
        {label}{sort === col ? (dir === "asc" ? " ▲" : " ▼") : ""}
      </Link>
    </th>
  );

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Course catalogue</h1>
          <p className="muted">Every course in the portal. <strong>Edit</strong> opens the lessons and modules; <strong>Modify</strong> changes the title, subject, level, departments and status; <strong>Delete</strong> removes a course after a confirmation.</p>
        </div>
        <div className="page-actions">
          <a className="btn-outline" href="#new-course">New course</a>
          <a className="btn" href="/admin/courses/upload">Upload a course</a>
        </div>
      </div>
      {sp.error ? <p role="alert">{sp.error}</p> : null}
      {sp.notice ? <p role="status">{sp.notice}</p> : null}

      <nav className="status-chips" aria-label="Filter by status">
        <Link href={link({ status: undefined, page: "1" })} aria-current={!status ? "page" : undefined}>All <span>{total()}</span></Link>
        {(["PUBLISHED", "DRAFT", "ARCHIVED"] as const).map((s) => (
          <Link key={s} href={link({ status: s, page: "1" })} aria-current={status === s ? "page" : undefined}>{STATUS_LABEL[s]} <span>{total(s)}</span></Link>
        ))}
      </nav>

      <form method="get" className="toolbar" aria-label="Search and filter courses">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label>Search <input type="search" name="q" defaultValue={q} placeholder="Course title or description" aria-label="Search courses" /></label>
        <label>Subject
          <select name="subject" defaultValue={sp.subject ?? ""} aria-label="Subject">
            <option value="">All subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>Level
          <select name="level" defaultValue={level ?? ""} aria-label="Level">
            <option value="">All levels</option>
            {(["BASIC", "INTERMEDIATE", "ADVANCED"] as const).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
        </label>
        <label>For
          <select name="department" defaultValue={sp.department ?? ""} aria-label="Department">
            <option value="">All departments</option>
            <option value="__all">Everyone (not department-specific)</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <button type="submit">Apply</button>
        <a href="/admin/courses" className="clear-link">Clear</a>
      </form>

      <p className="muted" aria-live="polite">{sorted.length === 0 ? "No courses match." : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length} courses`}</p>

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="data catalogue-table">
            <thead>
              <tr>
                <SortHeader col="title" label="Course" />
                <SortHeader col="subject" label="Subject" />
                <SortHeader col="level" label="Level" />
                <th scope="col" className="num">Lessons</th>
                <SortHeader col="learners" label="Learners" />
                <th scope="col">For</th>
                <SortHeader col="status" label="Status" />
                <SortHeader col="updated" label="Updated" />
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="course-cell">
                    <a href={`/admin/courses/${c.id}`} id={`c-${c.id}`} className="course-title">{c.title}</a>
                    {c.description ? <span className="course-desc">{c.description.length > 110 ? `${c.description.slice(0, 107)}…` : c.description}</span> : null}
                  </td>
                  <td>{c.subject.name}</td>
                  <td><span className={`level level-${c.level.toLowerCase()}`}>{LEVEL_LABEL[c.level]}</span></td>
                  <td className="num">{c._count.lessons}</td>
                  <td className="num nowrap" title="Started / completed">{startedBy.get(c.id) ?? 0} / {completedBy.get(c.id) ?? 0}</td>
                  <td>{c.departments.length === 0 ? <span className="muted">Everyone</span> : c.departments.join(", ")}</td>
                  <td><span className={STATUS_BADGE[c.status]}>{STATUS_LABEL[c.status]}</span></td>
                  <td className="nowrap">{date(c.updatedAt)}</td>
                  <td>
                    <div className="row-actions">
                      <a href={`/admin/courses/${c.id}`} className="act act-edit" aria-describedby={`c-${c.id}`}>Edit</a>
                      <a href={`/admin/courses/${c.id}/modify`} className="act act-modify" aria-describedby={`c-${c.id}`}>Modify</a>
                      <a href={`/admin/courses/${c.id}/delete`} className="act act-delete" aria-describedby={`c-${c.id}`}>Delete</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {pages > 1 ? (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link href={link({ page: String(page - 1) })}>← Previous</Link> : <span />}
          <span>Page {page} of {pages}</span>
          {page < pages ? <Link href={link({ page: String(page + 1) })}>Next →</Link> : <span />}
        </nav>
      ) : null}

      <section id="new-course" aria-labelledby="h-new" className="card">
        <h2 id="h-new">New course</h2>
        <p className="muted">Creates an empty draft. Add lessons on the next page, or use <a href="/admin/courses/upload">Upload a course</a> to build one from your own files.</p>
        <form data-test="create-course" action={createCourseAction}>
          <label>Title <input aria-label="Title" name="title" placeholder="Title" required /></label>{" "}
          <label>Subject
            <select aria-label="Subject" name="subjectId" required defaultValue="">
              <option value="" disabled>Choose a subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>{" "}
          <label>Level
            <select aria-label="Level" name="level" defaultValue="BASIC">
              <option value="BASIC">Basic</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>{" "}
          <label>Pass mark (%) <input aria-label="Pass mark percent" name="passMarkPercent" type="number" min={1} max={100} defaultValue={70} /></label>{" "}
          <label>Short description <input aria-label="Short description" name="description" placeholder="Short description" /></label>{" "}
          <button type="submit">Create course</button>
        </form>
      </section>
    </main>
  );
}
