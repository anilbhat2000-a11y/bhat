import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createSubjectAction } from "../../actions/subjects";
import { updateSubjectAction } from "../../actions/account";

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
      {subjects.map((s) => (
        <form key={s.id} action={updateSubjectAction} style={{ marginBottom: 8 }}>
          <input type="hidden" name="id" value={s.id} />
          <input name="name" defaultValue={s.name} required aria-label="Subject name" />{" "}
          <select name="category" defaultValue={s.category} aria-label="Category">
            <option value="BUSINESS">Business</option>
            <option value="TECHNICAL">Technical</option>
          </select>{" "}
          <input name="certificationValidityMonths" type="number" min={1} defaultValue={s.certificationValidityMonths} aria-label="Certificate validity in months" />{" "}
          <button type="submit">Save {s.name}</button>
        </form>
      ))}
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
