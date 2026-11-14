import { connection } from "next/server";
import Link from "next/link";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createAnnouncementAction, deleteAnnouncementAction } from "../../actions/community";
import { LocalTime } from "../../../components/LocalTime";

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { error, notice } = await searchParams;
  const [list, depts] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.user.findMany({ where: { active: true, department: { not: null } }, select: { department: true }, distinct: ["department"] }),
  ]);
  return (
    <main className="page">
      <h1>Announcements</h1>
      <p>Announcements appear on everyone&apos;s home page (or one department&apos;s). Tick the email box to also send them by email through the company mail server.</p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      <form data-test="announce" action={createAnnouncementAction}>
        <label>Title <input name="title" maxLength={200} required size={50} /></label>
        <br />
        <label>Message<br /><textarea name="body" rows={4} cols={60} maxLength={5000} required /></label>
        <br />
        <label>Audience{" "}
          <select name="department" defaultValue="">
            <option value="">Everyone</option>
            {depts.map((d) => <option key={d.department} value={d.department ?? ""}>{d.department} only</option>)}
          </select>
        </label>{" "}
        <label><input type="checkbox" name="email" /> Also send by email</label>{" "}
        <button type="submit">Post announcement</button>
      </form>
      <h2>Posted</h2>
      {list.length === 0 ? <p>No announcements yet.</p> : (
        <ul>
          {list.map((a) => (
            <li key={a.id} style={{ marginBottom: 8 }}>
              <strong>{a.title}</strong> ({a.department ? `${a.department} only` : "everyone"}, <LocalTime iso={a.createdAt.toISOString()} />{a.emailedAt ? ", emailed" : ""})
              <br /><span style={{ whiteSpace: "pre-wrap" }}>{a.body}</span>{" "}
              <form action={deleteAnnouncementAction} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" aria-label={`Remove announcement ${a.title}`}>Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <p><Link href="/admin">Back to the admin portal</Link></p>
    </main>
  );
}
