import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createSubjectAction } from "../../actions/subjects";

export default async function SubjectsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { error, notice } = await searchParams;
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Subjects</h1>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      <ul>
        {subjects.map((s) => (
          <li key={s.id}>{s.name} ({s.category}, certificate valid {s.certificationValidityMonths} months)</li>
        ))}
      </ul>
      <form data-test="create-subject" action={createSubjectAction}>
        <input name="name" placeholder="Subject name" required />{" "}
        <select name="category" defaultValue="BUSINESS">
          <option value="BUSINESS">Business</option>
          <option value="TECHNICAL">Technical</option>
        </select>{" "}
        <input name="certificationValidityMonths" type="number" min={1} defaultValue={12} />{" "}
        <button type="submit">Add subject</button>
      </form>
    </main>
  );
}
