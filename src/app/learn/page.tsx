import { connection } from "next/server";
import Link from "next/link";
import { requireSession } from "../../lib/auth/current-user";
import { prisma } from "../../lib/db/client";
import { dueSummary } from "../../lib/learning/home";
import { LocalTime } from "../../components/LocalTime";
import { openRemedialsFor } from "../../lib/assessments/remedial";
import { loadRows, recommendations, subjectProgress, weakTopics } from "../../lib/reports/analytics";
import { assignedCoursesFor } from "../../lib/learning/assignments";
import { announcementsFor } from "../../lib/community/community";

// "in 3 days", "in 5 hours", "overdue by 2 days": a countdown to the due time.
function countdown(due: Date, now: Date): string {
  const ms = due.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const span = days > 0 ? `${days} day${days === 1 ? "" : "s"}${hours ? ` ${hours} h` : ""}` : `${Math.max(1, hours)} hour${hours === 1 ? "" : "s"}`;
  return ms >= 0 ? `due in ${span}` : `overdue by ${span}`;
}

export default async function LearnHome() {
  await connection();
  const user = await requireSession();
  const now = new Date();
  const periods = await prisma.assessmentPeriod.findMany({
    where: { userId: user.id, assessment: { published: true } },
    include: { assessment: true },
    orderBy: { dueAt: "asc" },
  });
  const summary = dueSummary(
    periods.map((p) => ({ cadence: p.assessment.cadence, status: p.status, dueAt: p.dueAt })),
    now,
  );
  const sessions = await prisma.liveSessionRegistration.findMany({
    where: { userId: user.id, liveSession: { endsAt: { gte: now } } },
    include: { liveSession: { include: { lesson: { include: { course: true } } } } },
    orderBy: { liveSession: { startsAt: "asc" } },
    take: 10,
  });
  const remedials = await openRemedialsFor(user.id);
  const mine = await loadRows(user, { onlyUserId: user.id });
  const progress = subjectProgress(mine.courses, mine.progress);
  const weak = weakTopics(mine.attempts);
  const suggested = recommendations(weak, mine.courses, mine.progress);
  const [assigned, announcements] = await Promise.all([assignedCoursesFor(user.id, now), announcementsFor(user)]);
  const certificates = await prisma.certification.findMany({
    where: { userId: user.id, expiresAt: { gt: now } },
    include: { subject: true },
    orderBy: { issuedAt: "desc" },
    take: 5,
  });
  const open = periods.filter((p) => p.status === "OPEN" || p.status === "OVERDUE").slice(0, 10);

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Your learning</h1>
      <form method="get" action="/learn/search" role="search" className="no-print">
        <label>Search courses <input type="search" name="q" minLength={2} required /></label> <button type="submit">Search</button>
      </form>
      {announcements.length > 0 ? (
        <section aria-labelledby="h-news">
          <h2 id="h-news">Announcements</h2>
          <ul>
            {announcements.map((a) => (
              <li key={a.id}><strong>{a.title}</strong> (<LocalTime iso={a.createdAt.toISOString()} />)<br /><span style={{ whiteSpace: "pre-wrap" }}>{a.body}</span></li>
            ))}
          </ul>
        </section>
      ) : null}
      <ul>
        <li>Due this week: {summary.thisWeek}</li>
        <li>Due this month: {summary.thisMonth}</li>
        <li>Due this year: {summary.thisYear}</li>
        <li>Overdue: {summary.overdue}</li>
      </ul>
      {remedials.length > 0 ? (
        <>
          <h2>Remedial training</h2>
          <ul>
            {remedials.map((r) => (
              <li key={r.id}>
                You did not pass {r.assessment}.{" "}
                {r.courseId && r.courseTitle ? (
                  r.courseDone ? <>You have reviewed <Link href={`/learn/courses/${r.courseId}`}>{r.courseTitle}</Link>. </> : <>Work through <Link href={`/learn/courses/${r.courseId}`}>{r.courseTitle}</Link> again. </>
                ) : null}
                Your retake opens <LocalTime iso={r.retakeAfter.toISOString()} />.
                {r.managerComment ? <> Your manager says: {r.managerComment}</> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h2>Upcoming live sessions</h2>
      {sessions.length === 0 ? <p>No sessions booked.</p> : (
        <ul>
          {sessions.map((r) => (
            <li key={r.id}>
              {r.liveSession.lesson.title} ({r.liveSession.lesson.course.title}) — <LocalTime iso={r.liveSession.startsAt.toISOString()} />
            </li>
          ))}
        </ul>
      )}
      <h2>Assigned courses</h2>
      {assigned.length === 0 ? <p>No courses assigned to you.</p> : (
        <ul>
          {assigned.map((a) => (
            <li key={a.courseId}>
              <Link href={`/learn/courses/${a.courseId}`}>{a.title}</Link> ({a.subject}): {a.status}
              {a.dueAt && a.status !== "Completed" ? <>, <strong>{countdown(a.dueAt, now)}</strong></> : null}
            </li>
          ))}
        </ul>
      )}

      <h2>Assessments to do</h2>
      {open.length === 0 ? <p>Nothing due right now.</p> : (
        <ul>
          {open.map((p) => (
            <li key={p.id}>
              {p.assessment.title}: <strong>{countdown(p.dueAt, now)}</strong> (<LocalTime iso={p.dueAt.toISOString()} />)
            </li>
          ))}
        </ul>
      )}

      <h2>My progress by subject</h2>
      {progress.length === 0 ? <p>You have not started a course yet. <Link href="/learn/catalogue">Browse the catalogue</Link>.</p> : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {progress.map((p) => (
            <li key={`${p.subject}-${p.level}`} style={{ marginBottom: 8 }}>
              <label>
                {p.subject}, {p.level.toLowerCase()}: {p.completed} of {p.lessons} lessons ({p.percent}%)
                <br />
                <progress value={p.percent} max={100} style={{ width: "100%", maxWidth: 320 }}>{p.percent}%</progress>
              </label>
            </li>
          ))}
        </ul>
      )}

      {suggested.length > 0 ? (
        <>
          <h2>Recommended for you</h2>
          <p>Based on subjects where your scores are below the pass mark.</p>
          <ul>
            {suggested.map((r) => (
              <li key={r.courseId}><Link href={`/learn/courses/${r.courseId}`}>{r.course}</Link> ({r.subject}, {r.level.toLowerCase()})</li>
            ))}
          </ul>
        </>
      ) : null}

      <h2>My certificates</h2>
      {certificates.length === 0 ? <p>No active certificates yet.</p> : (
        <ul>
          {certificates.map((c) => (
            <li key={c.id}>
              {c.subject.name}, {c.level.toLowerCase()}, valid until <LocalTime iso={c.expiresAt.toISOString()} />:{" "}
              <a href={`/api/certificates/${c.id}`}>Download PDF</a> · <a href={`/verify/${c.verificationCode}`}>Verification page</a>
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
