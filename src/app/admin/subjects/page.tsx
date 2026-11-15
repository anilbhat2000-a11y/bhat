import { connection } from "next/server";
import Link from "next/link";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createSubjectAction, deleteSubjectAction, saveSubjectAction } from "../../actions/subjects";
import type { Category } from "../../../generated/prisma/client";

type Search = { q?: string; category?: string; edit?: string; error?: string; notice?: string };

const CATEGORY_LABEL: Record<Category, string> = { BUSINESS: "Business", TECHNICAL: "Technical" };
const months = (n: number) => (n % 12 === 0 ? `${n / 12} year${n === 12 ? "" : "s"}` : `${n} month${n === 1 ? "" : "s"}`);

function SubjectFields({ subject }: { subject?: { name: string; category: Category; certificationValidityMonths: number } }) {
  return (
    <div className="subject-fields">
      <label className="field">
        <span className="field-label">Subject name</span>
        <input name="name" required maxLength={100} defaultValue={subject?.name} placeholder="For example: Network Security" aria-label="Subject name" />
        <span className="field-help">Shown to employees in the catalogue, on assessments and on certificates.</span>
      </label>
      <label className="field">
        <span className="field-label">Category</span>
        <select name="category" defaultValue={subject?.category ?? "TECHNICAL"} aria-label="Category">
          <option value="TECHNICAL">Technical</option>
          <option value="BUSINESS">Business</option>
        </select>
        <span className="field-help">Technical: networking, cloud, security, data centre, support. Business: sales, finance, HR, compliance, soft skills.</span>
      </label>
      <label className="field field-narrow">
        <span className="field-label">Certificate valid for (months)</span>
        <input name="certificationValidityMonths" type="number" min={1} max={120} required defaultValue={subject?.certificationValidityMonths ?? 12} aria-label="Certificate validity in months" />
        <span className="field-help">After this, employees must pass the assessment again. 12 = one year.</span>
      </label>
    </div>
  );
}

// Subject areas: the topics that group courses and assessments, and decide how long a
// certificate in each topic stays valid.
export default async function SubjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const category = (["BUSINESS", "TECHNICAL"] as const).find((c) => c === sp.category);
  const now = new Date();

  const [all, published, activeCerts] = await Promise.all([
    prisma.subject.findMany({ include: { _count: { select: { courses: true, assessments: true, certifications: true } } } }),
    prisma.course.groupBy({ by: ["subjectId"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
    prisma.certification.groupBy({ by: ["subjectId"], where: { expiresAt: { gt: now }, user: { active: true } }, _count: { _all: true } }),
  ]);
  all.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const publishedBy = new Map(published.map((p) => [p.subjectId, p._count._all]));
  const certsBy = new Map(activeCerts.map((c) => [c.subjectId, c._count._all]));
  const rows = all.filter((s) => (!category || s.category === category) && (!q || s.name.toLowerCase().includes(q.toLowerCase())));
  const editing = sp.edit ? all.find((s) => s.id === sp.edit) : undefined;
  const count = (c?: Category) => all.filter((s) => !c || s.category === c).length;
  const link = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged = { q, category, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/subjects${s ? `?${s}` : ""}`;
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Subject areas</h1>
          <p className="muted">Subject areas are the main topics of your training, such as <em>Networking</em> or <em>GST and Accounts</em>. Every course and assessment belongs to one subject area, and each area sets how long its certificates stay valid.</p>
        </div>
        <div className="page-actions">
          <a className="btn" href="#add">Add a subject area</a>
        </div>
      </div>
      {sp.error ? <p role="alert">{sp.error}</p> : null}
      {sp.notice ? <p role="status">{sp.notice}</p> : null}

      <section className="stat-row" aria-label="Summary">
        <div><strong>{all.length}</strong><span>Subject areas</span></div>
        <div><strong>{all.reduce((n, s) => n + s._count.courses, 0)}</strong><span>Courses in them</span></div>
        <div><strong>{all.reduce((n, s) => n + s._count.assessments, 0)}</strong><span>Assessments</span></div>
        <div><strong>{[...certsBy.values()].reduce((a, b) => a + b, 0)}</strong><span>Valid certificates</span></div>
      </section>

      {editing ? (
        <section className="card subject-edit" aria-labelledby="h-edit" id="edit">
          <h2 id="h-edit">Edit “{editing.name}”</h2>
          <p className="muted">Renaming changes the name everywhere: courses, assessments and certificates keep their link to this subject. A new certificate validity applies to certificates issued from now on.</p>
          <form action={saveSubjectAction} data-test="edit-subject">
            <input type="hidden" name="id" value={editing.id} />
            <SubjectFields subject={editing} />
            <div className="form-actions">
              <button type="submit" className="btn-primary">Save changes</button>
              <a href={link({})} className="btn-outline">Cancel</a>
            </div>
          </form>
        </section>
      ) : null}

      <nav className="status-chips" aria-label="Filter by category">
        <Link href={link({ category: undefined })} aria-current={!category ? "page" : undefined}>All <span>{count()}</span></Link>
        {(["TECHNICAL", "BUSINESS"] as const).map((c) => (
          <Link key={c} href={link({ category: c })} aria-current={category === c ? "page" : undefined}>{CATEGORY_LABEL[c]} <span>{count(c)}</span></Link>
        ))}
      </nav>
      <form method="get" className="toolbar" aria-label="Search subject areas">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <label>Search <input type="search" name="q" defaultValue={q} placeholder="Subject name" aria-label="Search subject areas" /></label>
        <button type="submit">Search</button>
        {q ? <a href={link({ q: undefined })} className="clear-link">Clear</a> : null}
      </form>

      {rows.length === 0 ? (
        <p className="muted">{all.length === 0 ? "No subject areas yet. Add the first one below." : "No subject areas match your search."}</p>
      ) : (
        <div className="table-wrap">
          <table className="data subjects-table">
            <thead>
              <tr>
                <th scope="col">Subject area</th>
                <th scope="col">Category</th>
                <th scope="col" className="num">Courses<span className="th-sub">published / all</span></th>
                <th scope="col" className="num">Assessments</th>
                <th scope="col" className="num">Valid certificates</th>
                <th scope="col">Certificate valid for</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const inUse = s._count.courses + s._count.assessments + s._count.certifications > 0;
                return (
                  <tr key={s.id} className={editing?.id === s.id ? "row-current" : undefined}>
                    <td><strong id={`s-${s.id}`}>{s.name}</strong></td>
                    <td><span className={`cat cat-${s.category.toLowerCase()}`}>{CATEGORY_LABEL[s.category]}</span></td>
                    <td className="num">
                      {s._count.courses > 0 ? <a href={`/admin/courses?subject=${s.id}`} title="Show these courses">{publishedBy.get(s.id) ?? 0} / {s._count.courses}</a> : <span className="muted">0</span>}
                    </td>
                    <td className="num">{s._count.assessments}</td>
                    <td className="num">{certsBy.get(s.id) ?? 0}</td>
                    <td className="nowrap">{months(s.certificationValidityMonths)}</td>
                    <td>
                      <div className="row-actions">
                        <a href={`${link({ edit: s.id })}#edit`} className="act act-edit" aria-describedby={`s-${s.id}`}>Edit</a>
                        <a href={`/admin/courses?subject=${s.id}`} className="act act-modify" aria-describedby={`s-${s.id}`}>Courses</a>
                        {inUse ? null : (
                          <form action={deleteSubjectAction} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={s.id} />
                            <button type="submit" className="act act-delete" aria-label={`Delete ${s.name}`}>Delete</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small-note">A subject area can be deleted only while it has no courses, assessments or certificates.</p>

      <section className="card" aria-labelledby="h-add" id="add">
        <h2 id="h-add">Add a subject area</h2>
        <p className="muted">Create the subject area first, then add courses and assessments to it.</p>
        <form action={createSubjectAction} data-test="create-subject">
          <SubjectFields />
          <div className="form-actions">
            <button type="submit" className="btn-primary">Add subject area</button>
          </div>
        </form>
      </section>
    </main>
  );
}
