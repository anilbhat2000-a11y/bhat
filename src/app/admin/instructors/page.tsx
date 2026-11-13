import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createInstructorAction } from "../../actions/instructors";

export default async function InstructorsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { error, notice } = await searchParams;
  const instructors = await prisma.instructor.findMany({ orderBy: { name: "asc" } });
  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Instructors</h1>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      <ul>
        {instructors.map((i) => (
          <li key={i.id}>{i.name}{i.location ? `, ${i.location}` : ""}{i.expertise.length ? ` (${i.expertise.join(", ")})` : ""}</li>
        ))}
      </ul>
      <h2>Add an instructor</h2>
      <form data-test="create-instructor" action={createInstructorAction}>
        <label>Name <input name="name" required /></label>{" "}
        <label>Location <input name="location" placeholder="City, country" /></label>{" "}
        <label>Expertise <input name="expertise" placeholder="Networking, Cloud" /></label>{" "}
        <label>Bio <input name="bio" /></label>{" "}
        <button type="submit">Add instructor</button>
      </form>
    </main>
  );
}
