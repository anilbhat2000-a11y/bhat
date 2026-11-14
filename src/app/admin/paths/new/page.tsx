import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { prisma } from "../../../../lib/db/client";
import { GOALS, goalLabel, parseGoals, rankTemplates } from "../../../../lib/learning/paths";
import { copyTemplateAction, createPathAction } from "../../../actions/paths";

type Search = { goal?: string | string[]; mode?: string; error?: string };

export default async function NewPathPage({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const goals = parseGoals(([] as string[]).concat(sp.goal ?? []));
  const mode = sp.mode === "custom" ? "custom" : sp.mode === "ready" ? "ready" : null;

  return (
    <main className="page">
      <p><a href="/admin/paths">← Learning paths</a></p>
      <h1>Create a learning path</h1>
      {sp.error ? <p role="alert">{sp.error}</p> : null}

      <form method="get" aria-label="Training type and approach">
        <h2>What type of training do you want to create?</h2>
        <p>Choose one or more. This helps us suggest ready-made paths and courses that fit your goal.</p>
        <div className="card-grid">
          {GOALS.map((g) => (
            <label key={g.key} className="choice-card choice-check">
              <input type="checkbox" name="goal" value={g.key} defaultChecked={goals.includes(g.key)} />
              <span><strong>{g.label}</strong><small>{g.text}</small></span>
            </label>
          ))}
        </div>

        <h2>How do you want to start?</h2>
        <div className="card-grid">
          <label className="choice-card choice-check">
            <input type="radio" name="mode" value="ready" defaultChecked={mode !== "custom"} />
            <span><span className="badge-rec">Recommended</span><strong>Start from a ready-made path</strong><small>Choose from paths put together from this portal&apos;s courses for common roles and needs. You get your own copy to change.</small></span>
          </label>
          <label className="choice-card choice-check">
            <input type="radio" name="mode" value="custom" defaultChecked={mode === "custom"} />
            <span><strong>Build a custom path</strong><small>Pick any courses from the catalogue, including the ones your team uploaded, and put them in your own order.</small></span>
          </label>
        </div>
        <button type="submit">Continue</button>
      </form>

      {mode === "ready" ? <ReadyMade goals={goals} /> : null}
      {mode === "custom" ? <Custom goals={goals} /> : null}
    </main>
  );
}

async function ReadyMade({ goals }: { goals: ReturnType<typeof parseGoals> }) {
  const templates = await prisma.learningPath.findMany({
    where: { isTemplate: true },
    include: { courses: { orderBy: { position: "asc" }, include: { course: { select: { title: true, status: true } } } } },
  });
  const ranked = rankTemplates(templates, goals);
  return (
    <section aria-labelledby="h-ready">
      <h2 id="h-ready">Ready-made paths{goals.length ? ` for ${goals.map(goalLabel).join(", ").toLowerCase()}` : ""}</h2>
      {ranked.length === 0 ? <p>No ready-made path matches these training types. Build a custom path instead.</p> : (
        <div className="card-grid">
          {ranked.map((t) => (
            <section key={t.id} className="choice-card" aria-labelledby={`r-${t.id}`}>
              <h3 id={`r-${t.id}`}>{t.title}</h3>
              <p>{t.description}</p>
              <ol>{t.courses.map((c) => <li key={c.id}>{c.course.title}</li>)}</ol>
              <form action={copyTemplateAction}>
                <input type="hidden" name="templateId" value={t.id} />
                <button type="submit">Use this path</button>
              </form>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

async function Custom({ goals }: { goals: ReturnType<typeof parseGoals> }) {
  const courses = await prisma.course.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ subject: { name: "asc" } }, { level: "asc" }, { title: "asc" }],
    select: { id: true, title: true, level: true, status: true, departments: true, subject: { select: { name: true } } },
  });
  const bySubject = new Map<string, typeof courses>();
  for (const c of courses) bySubject.set(c.subject.name, [...(bySubject.get(c.subject.name) ?? []), c]);
  return (
    <section aria-labelledby="h-custom">
      <h2 id="h-custom">Build your path</h2>
      <form data-test="create-path" action={createPathAction} className="card">
        {goals.map((g) => <input key={g} type="hidden" name="goal" value={g} />)}
        <label>Name <input name="title" required maxLength={200} aria-label="Path name" /></label>
        <br />
        <label>Description <input name="description" maxLength={500} aria-label="Path description" style={{ width: "100%", maxWidth: 560 }} /></label>
        <p>Tick the courses to include. They are added in the order shown; you can change the order afterwards. Draft courses can be included, but learners see them only once published.</p>
        {[...bySubject.entries()].map(([subject, list]) => (
          <fieldset key={subject}>
            <legend>{subject}</legend>
            {list.map((c) => (
              <label key={c.id} style={{ display: "block" }}>
                <input type="checkbox" name="courseId" value={c.id} /> {c.title}{" "}
                <small>({c.level.toLowerCase()}{c.status === "DRAFT" ? ", draft" : ""}{c.departments.length ? `, for ${c.departments.join(", ")}` : ""})</small>
              </label>
            ))}
          </fieldset>
        ))}
        <button type="submit">Create learning path</button>
      </form>
    </section>
  );
}
