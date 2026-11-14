import { connection } from "next/server";
import { sendReminders } from "../../../../lib/notifications/send";
import { openAllPeriods } from "../../../../lib/assessments/open-periods";
import { smtpMailer } from "../../../../lib/notifications/mailer";
import { purgeOldData } from "../../../../lib/retention";

// Called by the scheduler every hour. Refused unless the request carries the cron secret.
export async function POST(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Not allowed", { status: 401 });
  }
  const now = new Date();
  // Retention first, so nothing is reminded about from data past the retention period.
  const purged = await purgeOldData(now);
  // Open the new periods and mark overdue ones, so reminders see the current state.
  const opened = await openAllPeriods(now);
  // Until the company SMTP server is configured, everything else still runs.
  if (!process.env.SMTP_URL) {
    return Response.json({ sent: 0, emailSkipped: "SMTP_URL is not set", opened: opened.created, failedToOpen: opened.failed, purged });
  }
  const result = await sendReminders(now, smtpMailer());
  return Response.json({ ...result, opened: opened.created, failedToOpen: opened.failed, purged });
}
