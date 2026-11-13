import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "../lib/auth/current-user";
import { HOME } from "../lib/auth/portal";

// The web portal's front door. A signed-in person is sent to their own portal; a visitor
// sees what the portal is for and how to sign in.
async function Portal() {
  await connection();
  const user = await currentUser();
  if (user) redirect(HOME[user.role]);
  return <Front />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Portal />
    </Suspense>
  );
}

function Front() {
  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>3C IT Solutions learning portal</h1>
      <p>
        Courses, assessments and certificates for the people who sell, deliver and support our
        technology: from sales and presales to networking, cloud and cyber security.
      </p>
      <p>
        <strong>Employees only.</strong> Sign in with your company account.
      </p>
      <p>
        <Link href="/login">Sign in</Link>
      </p>
      <ul>
        <li>Learners: your courses, weekly, monthly and annual assessments, and certificates.</li>
        <li>Managers: your team's learning progress and upcoming live sessions.</li>
        <li>Administrators: course and assessment content, users, reports and the audit log.</li>
      </ul>
    </main>
  );
}
