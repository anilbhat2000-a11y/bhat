import { connection } from "next/server";
import Link from "next/link";
import { requireSession } from "../../../lib/auth/current-user";
import { listCatalogue } from "../../../lib/learning/progress";

const LABEL = { BUSINESS: "Business skills", TECHNICAL: "Technical skills" } as const;
const LEVEL_LABEL = { BASIC: "Basic", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" } as const;
const duration = (m: number) => (m <= 0 ? "–" : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

export default async function CataloguePage({ searchParams }: { searchParams: Promise<{ q?: string; subject?: string; level?: string; show?: string }> }) {
  await connection();
  const user = await requireSession();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 100);
  const groups = await listCatalogue(user);
  const subjects = [...new Set(groups.flatMap((g) => g.courses.map((c) => c.subject)))].sort();
  const keep = (c: (typeof groups)[number]["courses"][number]) =>
    (!q || c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q))
    && (!sp.subject || c.subject === sp.subject)
    && (!sp.level || c.level === sp.level)
    && (sp.show !== "mine" || c.started)
    && (sp.show !== "new" || !c.started);
  const shown = groups.map((g) => ({ ...g, courses: g.courses.filter(keep) }));
  const count = shown.reduce((n, g) => n + g.courses.length, 0);

  return (
    <main className="page">
      <h1>Course catalogue</h1>
      <p className="muted">All the courses open to you. Search or filter, then open a course to start or continue.</p>
      <form method="get" className="toolbar" aria-label="Search and filter the catalogue">
        <label>Search <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Course title or topic" aria-label="Search the catalogue" /></label>
        <label>Subject
          <select name="subject" defaultValue={sp.subject ?? ""} aria-label="Subject">
            <option value="">All subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Level
          <select name="level" defaultValue={sp.level ?? ""} aria-label="Level">
            <option value="">All levels</option>
            <option value="BASIC">Basic</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </label>
        <label>Show
          <select name="show" defaultValue={sp.show ?? ""} aria-label="Show">
            <option value="">All courses</option>
            <option value="mine">Courses I have started</option>
            <option value="new">Courses I have not started</option>
          </select>
        </label>
        <button type="submit">Apply</button>
        <a href="/learn/catalogue" className="clear-link">Clear</a>
      </form>
      <p className="muted" aria-live="polite">{count} course{count === 1 ? "" : "s"}</p>

      {shown.map((g) => (
        <section key={g.category} aria-labelledby={`h-${g.category}`}>
          <h2 id={`h-${g.category}`}>{LABEL[g.category]}</h2>
          {g.courses.length === 0 ? <p>No courses match.</p> : (
            <div className="table-wrap">
              <table className="data catalogue-table">
                <thead>
                  <tr><th scope="col">Course</th><th scope="col">Subject</th><th scope="col">Level</th><th scope="col" className="num">Lessons</th><th scope="col">Duration</th><th scope="col">Your progress</th><th scope="col"><span className="sr-only">Action</span></th></tr>
                </thead>
                <tbody>
                  {g.courses.map((c) => (
                    <tr key={c.id}>
                      <td className="course-cell">
                        <Link href={`/learn/courses/${c.id}`} id={`lc-${c.id}`} className="course-title">{c.title}</Link>
                        {c.description ? <span className="course-desc">{c.description.length > 110 ? `${c.description.slice(0, 107)}…` : c.description}</span> : null}
                      </td>
                      <td>{c.subject}</td>
                      <td><span className={`level level-${c.level.toLowerCase()}`}>{LEVEL_LABEL[c.level]}</span></td>
                      <td className="num">{c.lessonCount}</td>
                      <td className="nowrap">{duration(c.minutes)}</td>
                      <td className="nowrap"><progress max={100} value={c.progress} aria-labelledby={`lc-${c.id}`} /> {c.progress}%</td>
                      <td><Link href={`/learn/courses/${c.id}`} className="act act-edit" aria-describedby={`lc-${c.id}`}>{c.completed ? "Review" : c.started ? "Continue" : "Start"}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
