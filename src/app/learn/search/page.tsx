import { connection } from "next/server";
import Link from "next/link";
import { requireSession } from "../../../lib/auth/current-user";
import { search } from "../../../lib/community/community";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const user = await requireSession();
  const { q = "" } = await searchParams;
  const results = await search(user, q);
  const total = results.courses.length + results.lessons.length + results.questions.length;
  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Search</h1>
      <form method="get" role="search">
        <label>Search courses and lessons{user.role === "ADMIN" ? ", and the question bank" : ""}{" "}
          <input type="search" name="q" defaultValue={q} minLength={2} required />
        </label>{" "}
        <button type="submit">Search</button>
      </form>
      {q.trim().length >= 2 ? <p role="status">{total === 0 ? "Nothing found." : `${total} result${total === 1 ? "" : "s"}`}</p> : null}
      {results.courses.length > 0 ? (
        <>
          <h2>Courses</h2>
          <ul>
            {results.courses.map((c) => (
              <li key={c.id}>
                <Link href={user.role === "ADMIN" ? `/admin/courses/${c.id}` : `/learn/courses/${c.id}`}>{c.title}</Link> ({c.subject.name}, {c.level.toLowerCase()}{user.role === "ADMIN" ? `, ${c.status.toLowerCase()}` : ""})
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {results.lessons.length > 0 ? (
        <>
          <h2>Lessons</h2>
          <ul>
            {results.lessons.map((l) => (
              <li key={l.id}><Link href={user.role === "ADMIN" ? `/admin/courses/${l.courseId}` : `/learn/courses/${l.courseId}`}>{l.title}</Link> in {l.course.title}</li>
            ))}
          </ul>
        </>
      ) : null}
      {results.questions.length > 0 ? (
        <>
          <h2>Questions</h2>
          <ul>
            {results.questions.map((x) => (
              <li key={x.id}><Link href={`/admin/assessments/${x.assessmentId}`}>{x.text.slice(0, 120)}</Link> in {x.assessment.title}</li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
