import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { teamMembers } from "../../../lib/manager/team";
import { goalLabel, pathReport } from "../../../lib/learning/paths";
import { assignPathAction } from "../../actions/paths";

// Managers assign the company's learning paths to people in their team and follow progress.
export default async function ManagerPathsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  const viewer = await guardPortal(["MANAGER", "ADMIN"]);
  const { error, notice } = await searchParams;
  const [paths, team] = await Promise.all([
    prisma.learningPath.findMany({ where: { isTemplate: false }, orderBy: { title: "asc" }, include: { courses: { orderBy: { position: "asc" }, include: { course: { select: { title: true } } } } } }),
    teamMembers(viewer),
  ]);
  const members = team.filter((m) => m.active && m.id !== viewer.id);
  const reports = new Map(await Promise.all(paths.map(async (p) => [p.id, await pathReport(viewer, p.id)] as const)));

  return (
    <main className="page">
      <h1>Learning paths</h1>
      <p>Assign a learning path to someone in your team. Each course in the path then appears on their home page with the due date you set. Paths are created by L&amp;D administrators.</p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {paths.length === 0 ? <p>No learning paths have been created yet.</p> : null}
      {paths.map((p) => {
        const r = reports.get(p.id) ?? [];
        return (
          <section key={p.id} className="card" aria-labelledby={`p-${p.id}`}>
            <h2 id={`p-${p.id}`}>{p.title}</h2>
            <p>{p.description} <small>{p.goals.map(goalLabel).join(", ")}</small></p>
            <details><summary>{p.courses.length} courses</summary><ol>{p.courses.map((c) => <li key={c.id}>{c.course.title}</li>)}</ol></details>
            {members.length === 0 ? <p>You have no team members to assign.</p> : (
              <form action={assignPathAction}>
                <input type="hidden" name="pathId" value={p.id} />
                <input type="hidden" name="targetType" value="USER" />
                <input type="hidden" name="returnTo" value="/manager/paths" />
                <label>Team member{" "}
                  <select name="targetValue" required defaultValue="" aria-label={`Team member for ${p.title}`}>
                    <option value="" disabled>Choose a person</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>{" "}
                <label>Due date (optional) <input type="date" name="dueDate" /></label>{" "}
                <button type="submit">Assign path</button>
              </form>
            )}
            {r.length === 0 ? <p><small>No one in your team is on this path yet.</small></p> : (
              <table className="data">
                <thead><tr><th scope="col">Person</th><th scope="col">Courses done</th><th scope="col">Due</th><th scope="col">Status</th></tr></thead>
                <tbody>{r.map((x) => <tr key={x.userId}><td>{x.name}</td><td className="num">{x.done} of {x.total}</td><td>{x.dueAt ? x.dueAt.toISOString().slice(0, 10) : "–"}</td><td>{x.status}</td></tr>)}</tbody>
              </table>
            )}
          </section>
        );
      })}
    </main>
  );
}
