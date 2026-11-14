import { connection } from "next/server";
import { requireSession } from "../../../lib/auth/current-user";
import { prisma } from "../../../lib/db/client";
import { startAttemptAction } from "../../actions/attempts";

export default async function MyAssessmentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const user = await requireSession();
  const { error } = await searchParams;
  const periods = await prisma.assessmentPeriod.findMany({
    where: { userId: user.id, assessment: { published: true } },
    include: { assessment: true },
    orderBy: { dueAt: "asc" },
  });

  return (
    <main className="page">
      <h1>My assessments</h1>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {periods.map((p) => (
          <li key={p.id}>
            <span>{p.assessment.title}</span> — {p.periodKey}, due {p.dueAt.toISOString().slice(0, 10)}, {p.status.toLowerCase()}{" "}
            {p.status === "OPEN" ? (
              <form action={startAttemptAction} style={{ display: "inline" }}>
                <input type="hidden" name="periodId" value={p.id} />
                <button type="submit">Start</button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
