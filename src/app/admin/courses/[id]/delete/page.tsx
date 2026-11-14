import { connection } from "next/server";
import { notFound } from "next/navigation";
import { guardPortal } from "../../../../../lib/auth/portal";
import { prisma } from "../../../../../lib/db/client";
import { courseImpact } from "../../../../../lib/learning/courses";
import { archiveFromCatalogueAction, deleteCourseConfirmedAction } from "../../../../actions/courses";

// Confirmation before deleting a course, showing what would be affected. A course with
// learner records cannot be deleted; archiving keeps those records.
export default async function DeleteCoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { id } = await params;
  const { error } = await searchParams;
  const course = await prisma.course.findUnique({ where: { id }, include: { subject: true } });
  if (!course) notFound();
  const impact = await courseImpact(id);
  const blocked = impact.hasLearnerRecords && course.status !== "DRAFT";

  return (
    <main className="page">
      <p><a href="/admin/courses">← Course catalogue</a></p>
      <h1>Delete course</h1>
      {error ? <p role="alert">{error}</p> : null}
      <section className="card" aria-labelledby="h-course">
        <h2 id="h-course">{course.title}</h2>
        <p className="muted">{course.subject.name} · {course.level.toLowerCase()} · {course.status.toLowerCase()}</p>
        <h3>What would be affected</h3>
        <ul>
          <li>{impact.lessons} lesson{impact.lessons === 1 ? "" : "s"}, with their files and progress records</li>
          <li>{impact.progress} learner{impact.progress === 1 ? "" : "s"} started it, {impact.completed} completed it</li>
          <li>{impact.attempts} attempt{impact.attempts === 1 ? "" : "s"} at its completion check</li>
          <li>{impact.assignments} assignment{impact.assignments === 1 ? "" : "s"} and {impact.paths} learning path{impact.paths === 1 ? "" : "s"} that include it</li>
        </ul>
      </section>

      {blocked ? (
        <section className="card" aria-labelledby="h-archive">
          <h2 id="h-archive">This course cannot be deleted</h2>
          <p>Learners have records in this course. Deleting it would erase their progress and history. <strong>Archive</strong> it instead: it leaves the catalogue, no one new can start it, and every learner record is kept. You can restore it any time with Modify.</p>
          <form action={archiveFromCatalogueAction}>
            <input type="hidden" name="id" value={course.id} />
            {course.status === "ARCHIVED" ? <p>This course is already archived.</p> : <button type="submit">Archive this course</button>}{" "}
            <a href="/admin/courses">Cancel</a>
          </form>
        </section>
      ) : (
        <section className="card" aria-labelledby="h-confirm">
          <h2 id="h-confirm">Confirm deletion</h2>
          <p>Deleting a course is permanent and cannot be undone.{course.status === "PUBLISHED" ? " It will be removed from the catalogue straight away." : ""} The deletion is recorded in the audit log.</p>
          <form data-test="delete-course" action={deleteCourseConfirmedAction}>
            <input type="hidden" name="id" value={course.id} />
            <label><input type="checkbox" name="confirm" required /> Yes, permanently delete &quot;{course.title}&quot;</label>
            <br />
            <button type="submit" className="btn-danger">Delete course</button>{" "}
            <a href="/admin/courses">Cancel</a>
          </form>
        </section>
      )}
    </main>
  );
}
