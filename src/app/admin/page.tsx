import { connection } from "next/server";
import Link from "next/link";
import { guardPortal } from "../../lib/auth/portal";

export default async function AdminHome() {
  await connection();
  await guardPortal(["ADMIN"]);
  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Admin portal</h1>
      <nav>
        <ul>
          <li><Link href="/admin/users">Users</Link></li>
          <li><Link href="/admin/subjects">Subjects</Link></li>
          <li><Link href="/admin/instructors">Instructors</Link></li>
          <li><Link href="/admin/courses">Courses</Link></li>
          <li><Link href="/admin/assessments">Assessments</Link></li>
          <li><Link href="/admin/dashboard">Dashboard</Link></li>
          <li><Link href="/admin/audit">Audit log</Link></li>
        </ul>
      </nav>
    </main>
  );
}
