import { connection } from "next/server";
import { notFound } from "next/navigation";
import { guardPortal } from "../../../../../lib/auth/portal";
import { prisma } from "../../../../../lib/db/client";
import { modifyCourseAction } from "../../../../actions/courses";

// "Modify" from the catalogue: a course's details, departments and status on one form.
export default async function ModifyCoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { id } = await params;
  const { error } = await searchParams;
  const [course, subjects, people] = await Promise.all([
    prisma.course.findUnique({ where: { id }, include: { _count: { select: { lessons: true } } } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { department: true } }),
  ]);
  if (!course) notFound();
  const departments = [...new Set([...people.map((p) => p.department).filter((x): x is string => !!x), ...course.departments])].sort();

  return (
    <main className="page">
      <p><a href="/admin/courses">← Course catalogue</a></p>
      <h1>Modify course</h1>
      <p className="muted">Change the course details and status. To change lessons, modules or files, use <a href={`/admin/courses/${course.id}`}>Edit</a>.</p>
      {error ? <p role="alert">{error}</p> : null}

      <form data-test="modify-course" action={modifyCourseAction} className="card">
        <input type="hidden" name="id" value={course.id} />
        <fieldset>
          <legend>Details</legend>
          <label>Title <input name="title" defaultValue={course.title} required maxLength={200} aria-label="Title" style={{ minWidth: 320 }} /></label>
          <label>Subject
            <select name="subjectId" defaultValue={course.subjectId} aria-label="Subject">
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>Level
            <select name="level" defaultValue={course.level} aria-label="Level">
              <option value="BASIC">Basic</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>
          <label>Pass mark (%) <input name="passMarkPercent" type="number" min={1} max={100} defaultValue={course.passMarkPercent} aria-label="Pass mark percent" /></label>
          <label style={{ flexBasis: "100%" }}>Description <textarea name="description" defaultValue={course.description ?? ""} maxLength={1000} aria-label="Description" /></label>
        </fieldset>

        <fieldset>
          <legend>Who is this course for?</legend>
          <small className="fieldset-help">Leave every box empty to show the course to everyone.</small>
          <div className="check-grid">
            {departments.map((d) => <label key={d}><input type="checkbox" name="department" value={d} defaultChecked={course.departments.includes(d)} /> {d}</label>)}
          </div>
          <label>Other departments (comma-separated) <input name="otherDepartments" aria-label="Other departments" /></label>
        </fieldset>

        <fieldset>
          <legend>Status</legend>
          <div className="check-grid" style={{ gridTemplateColumns: "1fr" }}>
            <label><input type="radio" name="status" value="DRAFT" defaultChecked={course.status === "DRAFT"} /> Draft: hidden from learners while you work on it</label>
            <label><input type="radio" name="status" value="PUBLISHED" defaultChecked={course.status === "PUBLISHED"} /> Published: in the catalogue for learners{course._count.lessons === 0 ? " (add a lesson first)" : ""}</label>
            <label><input type="radio" name="status" value="ARCHIVED" defaultChecked={course.status === "ARCHIVED"} /> Archived: retired from the catalogue; learners who started it keep read-only access</label>
          </div>
        </fieldset>

        <button type="submit">Save changes</button>{" "}
        <a href="/admin/courses">Cancel</a>
      </form>
    </main>
  );
}
