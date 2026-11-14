import { connection } from "next/server";
import { notFound } from "next/navigation";
import { guardPortal } from "../../../../lib/auth/portal";
import { prisma } from "../../../../lib/db/client";
import { GOALS, goalLabel, pathReport } from "../../../../lib/learning/paths";
import { assignPathAction, copyTemplateAction, deletePathAction, pathCourseAction, unassignPathAction, updatePathAction } from "../../../actions/paths";

const TARGET = { USER: "Person", DEPARTMENT: "Department", JOB_TITLE: "Job title" } as const;

export default async function PathPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  const viewer = await guardPortal(["ADMIN"]);
  const { id } = await params;
  const { error, notice } = await searchParams;
  const path = await prisma.learningPath.findUnique({
    where: { id },
    include: {
      courses: { orderBy: { position: "asc" }, include: { course: { select: { id: true, title: true, status: true, level: true, subject: { select: { name: true } } } } } },
      assignments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!path) notFound();
  const here = `/admin/paths/${path.id}`;

  if (path.isTemplate) {
    return (
      <main className="page">
        <p><a href="/admin/paths">← Learning paths</a></p>
        <h1>{path.title}</h1>
        <p><span className="badge-rec">Ready-made</span> {path.goals.map(goalLabel).join(", ")}</p>
        <p>{path.description}</p>
        <ol>{path.courses.map((c) => <li key={c.id}><a href={`/admin/courses/${c.course.id}`}>{c.course.title}</a> <small>({c.course.subject.name}, {c.course.level.toLowerCase()})</small></li>)}</ol>
        <form action={copyTemplateAction}>
          <input type="hidden" name="templateId" value={path.id} />
          <button type="submit">Use this path</button>
        </form>
      </main>
    );
  }

  const [report, people, courses] = await Promise.all([
    pathReport(viewer, path.id),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, department: true, jobTitle: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { status: { not: "ARCHIVED" }, id: { notIn: path.courses.map((c) => c.courseId) } }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const departments = [...new Set(people.map((p) => p.department).filter((x): x is string => !!x))].sort();
  const jobTitles = [...new Set(people.map((p) => p.jobTitle).filter((x): x is string => !!x))].sort();
  const counts = { assigned: report.length, completed: report.filter((r) => r.completed).length, progress: report.filter((r) => r.status === "In progress").length, overdue: report.filter((r) => r.status === "Overdue").length };

  return (
    <main className="page">
      <p><a href="/admin/paths">← Learning paths</a></p>
      <h1>{path.title}</h1>
      <nav className="subnav" aria-label="Sections on this page"><a href="#progress">Progress</a><a href="#assign">Assign</a><a href="#courses">Courses</a><a href="#details">Details</a></nav>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}

      <section aria-label="Path figures" className="tiles">
        <div className="tile is-blue" style={{ flexDirection: "column", gap: 0 }}><span className="tile-value">{counts.assigned}</span><span className="tile-label">People assigned</span></div>
        <div className="tile" style={{ flexDirection: "column", gap: 0 }}><span className="tile-value">{counts.progress}</span><span className="tile-label">In progress</span></div>
        <div className="tile is-green" style={{ flexDirection: "column", gap: 0 }}><span className="tile-value">{counts.completed}</span><span className="tile-label">Completed</span></div>
        <div className={`tile ${counts.overdue ? "is-red" : ""}`} style={{ flexDirection: "column", gap: 0 }}><span className="tile-value">{counts.overdue}</span><span className="tile-label">Overdue</span></div>
      </section>

      <h2 id="progress">Progress</h2>
      {report.length === 0 ? <p>Not assigned to anyone yet.</p> : (
        <table className="data">
          <thead><tr><th scope="col">Person</th><th scope="col">Department</th><th scope="col">Courses done</th><th scope="col">Progress</th><th scope="col">Due</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {report.map((r) => (
              <tr key={r.userId}>
                <td>{r.name}</td><td>{r.department || "–"}</td><td className="num">{r.done} of {r.total}</td>
                <td><progress max={100} value={r.percent} aria-label={`${r.name} progress`} /> {r.percent}%</td>
                <td>{r.dueAt ? r.dueAt.toISOString().slice(0, 10) : "–"}</td><td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 id="assign">Assign</h2>
      <p>Assign the path to a person, a department or everyone with a job title. Department and job-title assignments include people who join later. Each course in the path then appears on the learner&apos;s home page with the path&apos;s due date.</p>
      <form data-test="assign-path" action={assignPathAction}>
        <input type="hidden" name="pathId" value={path.id} />
        <input type="hidden" name="returnTo" value={`${here}#assign`} />
        <fieldset>
          <legend>Assign to</legend>
          <label>Who{" "}
            <select name="targetType" defaultValue="DEPARTMENT" aria-label="Assign to">
              <option value="DEPARTMENT">Department</option>
              <option value="JOB_TITLE">Job title</option>
              <option value="USER">Person (choose below)</option>
            </select>
          </label>{" "}
          <label>Department, job title or person{" "}
            <input name="targetValue" list="path-targets" required aria-label="Department, job title or person" />
          </label>
          <datalist id="path-targets">
            {departments.map((d) => <option key={`d-${d}`} value={d}>Department</option>)}
            {jobTitles.map((t) => <option key={`t-${t}`} value={t}>Job title</option>)}
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </datalist>{" "}
          <label>Due date (optional) <input name="dueDate" type="date" /></label>{" "}
          <button type="submit">Assign path</button>
        </fieldset>
      </form>
      {path.assignments.length === 0 ? null : (
        <ul>
          {path.assignments.map((a) => (
            <li key={a.id}>
              {TARGET[a.targetType]}: {a.targetType === "USER" ? nameOf.get(a.targetValue) ?? "(removed user)" : a.targetValue}
              {a.dueAt ? `, due ${a.dueAt.toISOString().slice(0, 10)}` : ", no due date"}{" "}
              <form action={unassignPathAction} style={{ display: "inline" }}>
                <input type="hidden" name="assignmentId" value={a.id} />
                <input type="hidden" name="returnTo" value={`${here}#assign`} />
                <button type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 id="courses">Courses in this path</h2>
      <ol className="path-courses">
        {path.courses.map((c, i) => (
          <li key={c.id}>
            <a href={`/admin/courses/${c.course.id}`}>{c.course.title}</a> <small>({c.course.subject.name}, {c.course.level.toLowerCase()}{c.course.status !== "PUBLISHED" ? `, ${c.course.status.toLowerCase()}: learners do not see it yet` : ""})</small>{" "}
            {(["up", "down", "remove"] as const).map((op) => (op === "up" && i === 0) || (op === "down" && i === path.courses.length - 1) ? null : (
              <form key={op} action={pathCourseAction} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={path.id} />
                <input type="hidden" name="courseId" value={c.course.id} />
                <input type="hidden" name="op" value={op} />
                <button type="submit" aria-label={`${op === "remove" ? "Remove" : `Move ${op}`}: ${c.course.title}`}>{op === "up" ? "↑" : op === "down" ? "↓" : "Remove"}</button>
              </form>
            ))}
          </li>
        ))}
      </ol>
      <form action={pathCourseAction}>
        <input type="hidden" name="id" value={path.id} />
        <input type="hidden" name="op" value="add" />
        <label>Add a course{" "}
          <select name="courseId" required defaultValue="" aria-label="Course to add">
            <option value="" disabled>Choose a course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>{" "}
        <button type="submit">Add course</button>
      </form>

      <h2 id="details">Details</h2>
      <form action={updatePathAction}>
        <input type="hidden" name="id" value={path.id} />
        <label>Name <input name="title" defaultValue={path.title} required aria-label="Path name" /></label>
        <br />
        <label>Description <input name="description" defaultValue={path.description ?? ""} aria-label="Path description" style={{ width: "100%", maxWidth: 560 }} /></label>
        <fieldset>
          <legend>Training type</legend>
          <div className="check-grid">{GOALS.map((g) => <label key={g.key}><input type="checkbox" name="goal" value={g.key} defaultChecked={path.goals.includes(g.key)} /> {g.label}</label>)}</div>
        </fieldset>
        <button type="submit">Save details</button>
      </form>
      <form action={deletePathAction}>
        <input type="hidden" name="id" value={path.id} />
        <button type="submit" className="btn-danger">Delete this learning path</button>
      </form>
    </main>
  );
}
