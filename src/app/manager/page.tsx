import { connection } from "next/server";
import Link from "next/link";
import { guardPortal } from "../../lib/auth/portal";
import { LmsDashboard, parseTab } from "../../components/LmsDashboard";
import { lmsDashboard, parseDuration } from "../../lib/reports/lms-dashboard";

// The manager's home: the LMS dashboard for their reporting line.
export default async function ManagerHome({ searchParams }: { searchParams: Promise<{ duration?: string; tab?: string }> }) {
  await connection();
  const viewer = await guardPortal(["MANAGER", "ADMIN"]);
  const sp = await searchParams;
  const duration = parseDuration(sp.duration);
  const data = await lmsDashboard(viewer, duration);
  return (
    <main className="page">
      <h1>Welcome, {viewer.name.split(" ")[0]}</h1>
      <p>How your team is learning. <Link href="/manager/team">See each team member</Link>.</p>
      <LmsDashboard data={data} duration={duration} tab={parseTab(sp.tab)} basePath="/manager" scopeLabel="Your team's learning"
        links={{ invite: "/manager/team", paths: "/manager/paths", courses: "/manager/team/summary", certificates: "/manager/certificates", assign: "/manager/paths" }} />
    </main>
  );
}
