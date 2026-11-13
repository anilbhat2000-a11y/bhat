import { connection } from "next/server";
import Link from "next/link";
import { requireSession } from "../../../lib/auth/current-user";
import { teamMembers } from "../../../lib/manager/team";

export default async function TeamPage() {
  await connection();
  const viewer = await requireSession();
  const members = await teamMembers(viewer);
  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>My team</h1>
      {members.length === 0 ? <p>No one reports to you yet.</p> : (
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Status</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td><Link href={`/manager/team/${m.id}`}>{m.name}</Link></td>
                <td>{m.email}</td>
                <td>{m.department ?? ""}</td>
                <td>{m.active ? "Active" : "Deactivated"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
