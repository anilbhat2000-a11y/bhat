import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createCourseAction } from "../../actions/courses";

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; department?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { error, notice, department } = await searchParams;
  const [all, subjects, people] = await Promise.all([
    prisma.course.findMany({ orderBy: { title: "asc" }, include: { subject: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { department: true } }),
  ]);
  const departments = [...new Set([...people.map((p) => p.department), ...all.flatMap((c) => c.departments)].filter((x): x is string => !!x))].sort();
  const courses = !department ? all : department === "__all" ? all.filter((c) => c.departments.length === 0) : all.filter((c) => c.departments.includes(department));

  return (
    <main className="page">
      <h1>Courses</h1>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      <p><a className="btn" href="/admin/courses/upload">Upload a course</a> <small>Build a course from your own PDF and video files, for one or more departments.</small></p>
      <form method="get" aria-label="Filter courses">
        <label>Show courses for{" "}
          <select name="department" defaultValue={department ?? ""}>
            <option value="">All courses</option>
            <option value="__all">Everyone (not department-specific)</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>{" "}
        <button type="submit">Show</button>
      </form>
      <table className="data">
        <thead><tr><th scope="col">Course</th><th scope="col">Subject</th><th scope="col">Level</th><th scope="col">For</th><th scope="col">Status</th></tr></thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id}>
              <td><a href={`/admin/courses/${c.id}`}>{c.title}</a></td>
              <td>{c.subject.name}</td>
              <td>{c.level.charAt(0) + c.level.slice(1).toLowerCase()}</td>
              <td>{c.departments.length === 0 ? "Everyone" : c.departments.join(", ")}</td>
              <td>{({ DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" } as const)[c.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {courses.length === 0 ? <p>No courses match.</p> : null}
      <h2>New course</h2>
      <form data-test="create-course" action={createCourseAction}>
        <input aria-label="Title" name="title" placeholder="Title" required />{" "}
        <select aria-label="Subject" name="subjectId" required defaultValue="">
          <option value="" disabled>Choose a subject</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>{" "}
        <select aria-label="Level" name="level" defaultValue="BASIC">
          <option value="BASIC">Basic</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>{" "}
        <input aria-label="Pass mark percent" name="passMarkPercent" type="number" min={1} max={100} defaultValue={70} />{" "}
        <input aria-label="Short description" name="description" placeholder="Short description" />{" "}
        <button type="submit">Create course</button>
      </form>
    </main>
  );
}
