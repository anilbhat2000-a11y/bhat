import { connection } from "next/server";
import Link from "next/link";
import { requireSession } from "../../lib/auth/current-user";
import { prisma } from "../../lib/db/client";
import { dueSummary } from "../../lib/learning/home";

export default async function LearnHome() {
  await connection();
  const user = await requireSession();
  const now = new Date();
  const periods = await prisma.assessmentPeriod.findMany({
    where: { userId: user.id },
    include: { assessment: true },
    orderBy: { dueAt: "asc" },
  });
  const summary = dueSummary(
    periods.map((p) => ({ cadence: p.assessment.cadence, status: p.status, dueAt: p.dueAt })),
    now,
  );
  const open = periods.filter((p) => p.status === "OPEN" || p.status === "OVERDUE").slice(0, 10);

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Your learning</h1>
      <ul>
        <li>Due this week: {summary.thisWeek}</li>
        <li>Due this month: {summary.thisMonth}</li>
        <li>Due this year: {summary.thisYear}</li>
        <li>Overdue: {summary.overdue}</li>
      </ul>
      <h2>Assessments to do</h2>
      {open.length === 0 ? <p>Nothing due right now.</p> : (
        <ul>
          {open.map((p) => (
            <li key={p.id}>
              {p.assessment.title} — due {p.dueAt.toISOString().slice(0, 10)} ({p.status.toLowerCase()})
            </li>
          ))}
        </ul>
      )}
      <nav>
        <Link href="/learn/catalogue">Course catalogue</Link> · <Link href="/learn/assessments">All my assessments</Link> · <Link href="/learn/certifications">My certifications</Link> · <Link href="/learn/profile">My profile</Link>
      </nav>
    </main>
  );
}
