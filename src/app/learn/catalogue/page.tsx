import { connection } from "next/server";
import Link from "next/link";
import { requireSession } from "../../../lib/auth/current-user";
import { listCatalogue } from "../../../lib/learning/progress";

const LABEL = { BUSINESS: "Business skills", TECHNICAL: "Technical skills" } as const;

export default async function CataloguePage() {
  await connection();
  const user = await requireSession();
  const groups = await listCatalogue(user);
  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Course catalogue</h1>
      {groups.map((g) => (
        <section key={g.category}>
          <h2>{LABEL[g.category]}</h2>
          {g.courses.length === 0 ? <p>No courses yet.</p> : (
            <ul>
              {g.courses.map((c) => (
                <li key={c.id}>
                  <Link href={`/learn/courses/${c.id}`}>{c.title}</Link> — {c.subject}, {c.level.toLowerCase()}, {c.progress}% done
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
