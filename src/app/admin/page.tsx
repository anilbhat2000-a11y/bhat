import { connection } from "next/server";
import Link from "next/link";
import { guardPortal } from "../../lib/auth/portal";
import { prisma } from "../../lib/db/client";
import { Icon } from "../../components/Icon";
import type { IconName } from "../../components/nav";
import { LmsDashboard, parseTab } from "../../components/LmsDashboard";
import { lmsDashboard, parseDuration } from "../../lib/reports/lms-dashboard";

const SHORTCUTS: { href: string; icon: IconName; title: string; text: string }[] = [
  { href: "/admin/courses/upload", icon: "book", title: "Upload a course", text: "Your own PDFs and videos, for chosen departments" },
  { href: "/admin/courses/bulk", icon: "layers", title: "Bulk upload courses", text: "Many courses from one Excel workbook and files" },
  { href: "/admin/paths/new", icon: "list", title: "Create a learning path", text: "Ready-made or custom, then assign it" },
  { href: "/admin/users", icon: "users", title: "Users", text: "Add people, import a CSV, set managers" },
  { href: "/admin/courses", icon: "book", title: "Courses", text: "Build courses, modules and lessons" },
  { href: "/admin/assessments", icon: "check", title: "Assessments", text: "Weekly, monthly and annual tests" },
  { href: "/admin/grading", icon: "inbox", title: "Grading queue", text: "Mark short answers" },
  { href: "/admin/dashboard", icon: "chart", title: "Reports", text: "Certifications, completion, pass rates" },
  { href: "/admin/certificates", icon: "award", title: "Certificates", text: "Issued certificates, search and download" },
  { href: "/admin/announcements", icon: "megaphone", title: "Announcements", text: "Tell staff about new courses" },
  { href: "/admin/audit", icon: "shield", title: "Audit log", text: "Every change, who and when" },
  { href: "/learn/search", icon: "search", title: "Search", text: "Courses, lessons and questions" },
];

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ duration?: string; tab?: string }> }) {
  await connection();
  const user = await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const duration = parseDuration(sp.duration);
  const now = new Date();
  const dashboard = await lmsDashboard(user, duration, now);
  const [people, courses, assessments, waiting, overdue, certified] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.assessment.count({ where: { published: true } }),
    prisma.assessmentAttempt.count({ where: { status: "AWAITING_GRADING" } }),
    prisma.assessmentPeriod.count({ where: { status: "OVERDUE", user: { active: true } } }),
    prisma.certification.count({ where: { expiresAt: { gt: now }, user: { active: true } } }),
  ]);
  const stats: { value: number; label: string; tone: string; href: string }[] = [
    { value: people, label: "Active users", tone: "is-blue", href: "/admin/users" },
    { value: courses, label: "Published courses", tone: "is-green", href: "/admin/courses" },
    { value: assessments, label: "Published assessments", tone: "", href: "/admin/assessments" },
    { value: certified, label: "Valid certificates", tone: "is-green", href: "/admin/dashboard" },
    { value: waiting, label: "Waiting to be graded", tone: waiting > 0 ? "is-red" : "", href: "/admin/grading" },
    { value: overdue, label: "Overdue assessments", tone: overdue > 0 ? "is-red" : "", href: "/admin/dashboard" },
  ];

  return (
    <main className="page">
      <h1>Welcome, {user.name.split(" ")[0]}</h1>
      <p>Here is the state of learning across the company today.</p>

      <LmsDashboard data={dashboard} duration={duration} tab={parseTab(sp.tab)} basePath="/admin" scopeLabel="Your LMS dashboard"
        links={{ invite: "/admin/users", paths: "/admin/paths", courses: "/admin/dashboard", certificates: "/admin/certificates", assign: "/admin/paths/new" }} />

      <h2>At a glance</h2>
      <section aria-label="Key figures" className="tiles">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`tile tile-link ${s.tone}`} style={{ flexDirection: "column", gap: 0 }}>
            <span className="tile-value" style={{ color: "var(--text)", fontSize: "1.9rem" }}>{s.value}</span>
            <span className="tile-label">{s.label}</span>
          </Link>
        ))}
      </section>

      <h2>Quick actions</h2>
      <nav aria-label="Admin shortcuts" className="tiles">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href} className="tile tile-link">
            <Icon name={s.icon} size={24} />
            <span>
              <strong style={{ color: "var(--text)", fontSize: "1rem" }}>{s.title}</strong>
              <span>{s.text}</span>
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
