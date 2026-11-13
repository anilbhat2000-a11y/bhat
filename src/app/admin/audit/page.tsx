import { connection } from "next/server";
import { listAudit } from "../../../lib/audit/record";
import { prisma } from "../../../lib/db/client";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entityType?: string }> }) {
  await connection();
  const { entityType } = await searchParams;
  const events = await listAudit({ entityType: entityType || undefined, limit: 200 });
  const actors = new Map((await prisma.user.findMany({ where: { id: { in: [...new Set(events.map((e) => e.actorId))] } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Audit log</h1>
      <form>
        <label>Entity type <input name="entityType" defaultValue={entityType ?? ""} placeholder="User, Course, Assessment" /></label>{" "}
        <button type="submit">Filter</button>
      </form>
      <table>
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Before</th><th>After</th></tr></thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>{e.at.toISOString()}</td>
              <td>{actors.get(e.actorId) ?? e.actorId}</td>
              <td>{e.action}</td>
              <td>{e.entityType} {e.entityId}</td>
              <td><code>{JSON.stringify(e.before)}</code></td>
              <td><code>{JSON.stringify(e.after)}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
