import { connection } from "next/server";
import { prisma } from "../../../lib/db/client";
import { createCourseAction } from "../../actions/courses";

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const { error } = await searchParams;
  const [courses, subjects] = await Promise.all([
    prisma.course.findMany({ orderBy: { title: "asc" }, include: { subject: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Courses</h1>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {courses.map((c) => (
          <li key={c.id}>
            <a href={`/admin/courses/${c.id}`}>{c.title}</a> — {c.subject.name}, {c.level}, {c.status === "PUBLISHED" ? "Published" : "Draft"}
          </li>
        ))}
      </ul>
      <h2>New course</h2>
      <form data-test="create-course" action={createCourseAction}>
        <input name="title" placeholder="Title" required />{" "}
        <select name="subjectId" required defaultValue="">
          <option value="" disabled>Choose a subject</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>{" "}
        <select name="level" defaultValue="BASIC">
          <option value="BASIC">Basic</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>{" "}
        <input name="passMarkPercent" type="number" min={1} max={100} defaultValue={70} />{" "}
        <input name="description" placeholder="Short description" />{" "}
        <button type="submit">Create course</button>
      </form>
    </main>
  );
}
