import { connection } from "next/server";
import Link from "next/link";
import { guardPortal } from "../../../lib/auth/portal";
import { gradingQueue } from "../../../lib/assessments/grading";
import { LocalTime } from "../../../components/LocalTime";

export default async function GradingQueuePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  await connection();
  const actor = await guardPortal(["ADMIN"]);
  const { notice } = await searchParams;
  const queue = await gradingQueue(actor);
  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Grading queue</h1>
      <p>Attempts with short answers wait here until a reviewer marks them. The oldest are first.</p>
      {notice ? <p role="status">{notice}</p> : null}
      {queue.length === 0 ? <p>Nothing is waiting to be graded.</p> : (
        <table>
          <caption>{queue.length} attempt{queue.length === 1 ? "" : "s"} waiting</caption>
          <thead>
            <tr><th scope="col">Learner</th><th scope="col">Department</th><th scope="col">Assessment</th><th scope="col">Submitted</th><th scope="col"><span className="sr-only">Action</span></th></tr>
          </thead>
          <tbody>
            {queue.map((q) => (
              <tr key={q.id}>
                <td>{q.learner}</td>
                <td>{q.department ?? ""}</td>
                <td>{q.assessment} ({q.periodKey})</td>
                <td>{q.submittedAt ? <LocalTime iso={q.submittedAt.toISOString()} /> : ""}</td>
                <td>{q.canGrade ? <Link href={`/admin/grading/${q.id}`}>Grade</Link> : "Your own attempt"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p><Link href="/admin">Back to the admin portal</Link></p>
    </main>
  );
}
