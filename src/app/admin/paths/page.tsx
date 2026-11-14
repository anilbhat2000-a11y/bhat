import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { goalLabel, pathReport } from "../../../lib/learning/paths";
import { copyTemplateAction } from "../../actions/paths";

export default async function PathsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  const viewer = await guardPortal(["ADMIN"]);
  const { error, notice } = await searchParams;
  const paths = await prisma.learningPath.findMany({
    orderBy: [{ isTemplate: "asc" }, { title: "asc" }],
    include: { _count: { select: { courses: true, assignments: true } } },
  });
  const mine = paths.filter((p) => !p.isTemplate);
  const templates = paths.filter((p) => p.isTemplate);
  const reports = new Map(await Promise.all(mine.map(async (p) => [p.id, await pathReport(viewer, p.id)] as const)));

  return (
    <main className="page">
      <h1>Learning paths</h1>
      <p>A learning path is a set of courses in a planned order, assigned as one unit: for example a new joiner&apos;s first month, or an engineer&apos;s track. Learners see the path and their progress on their home page, and get reminders before the due date.</p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      <p><a className="btn" href="/admin/paths/new">Create a learning path</a></p>

      <h2>Your learning paths</h2>
      {mine.length === 0 ? <p>No learning paths yet. Create one, or start from a ready-made path below.</p> : (
        <table className="data">
          <thead><tr><th scope="col">Learning path</th><th scope="col">Training type</th><th scope="col">Courses</th><th scope="col">People assigned</th><th scope="col">Completed</th><th scope="col">Overdue</th></tr></thead>
          <tbody>
            {mine.map((p) => {
              const r = reports.get(p.id) ?? [];
              return (
                <tr key={p.id}>
                  <td><a href={`/admin/paths/${p.id}`}>{p.title}</a></td>
                  <td>{p.goals.map(goalLabel).join(", ") || "–"}</td>
                  <td className="num">{p._count.courses}</td>
                  <td className="num">{r.length}</td>
                  <td className="num">{r.filter((x) => x.completed).length}</td>
                  <td className="num">{r.filter((x) => x.status === "Overdue").length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>Ready-made learning paths</h2>
      <p>Put together from this portal&apos;s courses for common needs. Use one to make your own copy, which you can change and assign.</p>
      <div className="card-grid">
        {templates.map((t) => (
          <section key={t.id} className="choice-card" aria-labelledby={`t-${t.id}`}>
            <h3 id={`t-${t.id}`}><a href={`/admin/paths/${t.id}`}>{t.title}</a></h3>
            <p>{t.description}</p>
            <p><small>{t._count.courses} courses · {t.goals.map(goalLabel).join(", ")}</small></p>
            <form action={copyTemplateAction}>
              <input type="hidden" name="templateId" value={t.id} />
              <button type="submit">Use this path</button>
            </form>
          </section>
        ))}
      </div>
    </main>
  );
}
