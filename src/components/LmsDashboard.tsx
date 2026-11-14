import Link from "next/link";
import { Icon } from "./Icon";
import type { IconName } from "./nav";
import { Illustration } from "./Illustration";
import { DURATIONS, type Duration, type lmsDashboard } from "../lib/reports/lms-dashboard";

type Data = Awaited<ReturnType<typeof lmsDashboard>>;
type Tab = "due" | "overdue" | "done";
type Links = { invite: string; paths: string; courses: string; certificates: string; assign: string };

const date = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "–");

function SummaryCard({ icon, title, tone, rows, link }: { icon: IconName; title: string; tone: string; rows: [string, number][]; link: { href: string; label: string } }) {
  return (
    <section className={`dash-card ${tone}`} aria-label={title}>
      <h3><span className="dash-icon"><Icon name={icon} size={18} /></span>{title}</h3>
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <Link href={link.href} className="dash-link">{link.label}</Link>
    </section>
  );
}

// The LMS dashboard: four summary cards, assigned work in three tabs and recent activity.
// Shared by the admin home (whole company) and the manager home (their team).
export function LmsDashboard({ data, duration, tab, basePath, links, scopeLabel }: {
  data: Data; duration: Duration; tab: Tab; basePath: string; links: Links; scopeLabel: string;
}) {
  const list = tab === "overdue" ? data.work.overdue : tab === "done" ? data.work.completed : data.work.dueSoon;
  const tabs: [Tab, string, number][] = [["due", "Due soon", data.work.dueSoon.length], ["overdue", "Overdue", data.work.overdue.length], ["done", "Completed", data.work.completed.length]];
  const emptyText = tab === "overdue" ? "Nothing is overdue. Well done." : tab === "done" ? "Assigned courses completed in this period will appear here." : "Assigned learning with a due date in the next 14 days will appear here.";

  return (
    <>
      <div className="dash-head">
        <h2>{scopeLabel}</h2>
        <form method="get" className="dash-duration" aria-label="Choose a period">
          <input type="hidden" name="tab" value={tab} />
          <label>Period{" "}
            <select name="duration" defaultValue={duration} aria-label="Period">
              {DURATIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </label>{" "}
          <button type="submit">Show</button>
        </form>
      </div>

      <div className="dash-cards">
        <SummaryCard icon="users" title="Team members" tone="tone-blue" rows={[["People on the portal", data.members.total], ["Active in this period", data.members.active]]} link={{ href: links.invite, label: basePath === "/admin" ? "Add team members" : "View team members" }} />
        <SummaryCard icon="list" title="Learning paths" tone="tone-green" rows={[[basePath === "/admin" ? "Paths created" : "Paths your team is on", data.paths.created], ["Paths completed", data.paths.completed]]} link={{ href: links.paths, label: "View learning path reports" }} />
        <SummaryCard icon="book" title="Course completions" tone="tone-teal" rows={[["Courses in progress", data.courses.inProgress], ["Courses completed", data.courses.completed]]} link={{ href: links.courses, label: "View course reports" }} />
        <SummaryCard icon="award" title="Certificates" tone="tone-amber" rows={[["Issued in this period", data.certificates.issued], ["Valid today", data.certificates.valid]]} link={{ href: links.certificates, label: "View certificates" }} />
      </div>

      <div className="dash-lower">
        <section className="dash-panel" aria-label="Assigned learning">
          <nav className="dash-tabs" aria-label="Assigned learning">
            {tabs.map(([key, label, n]) => (
              <Link key={key} aria-current={tab === key ? "page" : undefined} className={tab === key ? "is-active" : ""} href={`${basePath}?tab=${key}&duration=${duration}`}>{label} ({n})</Link>
            ))}
          </nav>
          <div className="dash-tabpanel">
            {list.length === 0 ? (
              <div className="dash-empty">
                <Illustration name="calendar" />
                <p>{emptyText}</p>
                <Link href={links.assign} className="btn-outline">Create and assign learning paths</Link>
              </div>
            ) : (
              <table className="data">
                <thead><tr><th scope="col">Person</th><th scope="col">Course</th><th scope="col">{tab === "done" ? "Completed" : "Due"}</th></tr></thead>
                <tbody>
                  {list.slice(0, 50).map((i) => (
                    <tr key={`${i.userId}-${i.courseId}`}><td>{i.name}</td><td>{i.course}</td><td>{date(tab === "done" ? i.completedAt : i.dueAt)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {list.length > 50 ? <p><small>Showing the first 50 of {list.length}.</small></p> : null}
          </div>
        </section>

        <section className="dash-panel" aria-labelledby="h-activity">
          <h3 id="h-activity" className="dash-panel-title">Recent activity</h3>
          {data.activity.length === 0 ? (
            <div className="dash-empty">
              <Illustration name="team" />
              <p>Your team&apos;s activity will appear here once they begin learning.</p>
              <Link href={links.invite} className="btn-outline">{basePath === "/admin" ? "Add more team members" : "View team members"}</Link>
            </div>
          ) : (
            <ul className="activity">
              {data.activity.map((a, i) => (
                <li key={i}><span className={`dot dot-${a.kind}`} aria-hidden="true" />{a.text}<br /><small>{date(a.at)}</small></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export function parseTab(v: string | undefined): Tab {
  return v === "overdue" || v === "done" ? v : "due";
}
