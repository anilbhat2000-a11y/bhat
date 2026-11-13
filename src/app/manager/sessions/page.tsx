import { connection } from "next/server";
import { requireSession } from "../../../lib/auth/current-user";
import { prisma } from "../../../lib/db/client";
import { teamMembers } from "../../../lib/manager/team";
import { markAttendanceAction } from "../../actions/live";

// Sessions your team is booked on. Mark attendance for your own team only.
export default async function ManagerSessionsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  const viewer = await requireSession();
  const { error, notice } = await searchParams;
  const teamIds = (await teamMembers(viewer)).map((m) => m.id);
  const rows = await prisma.liveSessionRegistration.findMany({
    where: { userId: { in: teamIds }, liveSession: { endsAt: { gte: new Date(Date.now() - 7 * 24 * 3600_000) } } },
    include: { user: true, liveSession: { include: { lesson: { include: { course: true } } } } },
    orderBy: { liveSession: { startsAt: "desc" } },
  });
  const bySession = new Map<string, typeof rows>();
  for (const r of rows) bySession.set(r.liveSessionId, [...(bySession.get(r.liveSessionId) ?? []), r]);

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Team sessions</h1>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {bySession.size === 0 ? <p>No team members are booked on a session.</p> : null}
      {[...bySession.entries()].map(([sessionId, regs]) => {
        const s = regs[0].liveSession;
        return (
          <section key={sessionId}>
            <h2>{s.lesson.title} ({s.lesson.course.title})</h2>
            <p>{s.startsAt.toISOString().replace("T", " ").slice(0, 16)} UTC</p>
            <form action={markAttendanceAction}>
              <input type="hidden" name="sessionId" value={sessionId} />
              {regs.map((r) => (
                <label key={r.id} style={{ display: "block" }}>
                  <input type="checkbox" name="attendeeIds" value={r.userId} defaultChecked={r.attended} /> {r.user.name}
                </label>
              ))}
              <button type="submit">Save attendance</button>
            </form>
          </section>
        );
      })}
    </main>
  );
}
