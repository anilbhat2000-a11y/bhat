import { connection } from "next/server";
import { sendReminders } from "../../../../lib/notifications/send";
import { openAllPeriods } from "../../../../lib/assessments/open-periods";
import { smtpMailer } from "../../../../lib/notifications/mailer";

// Called by the scheduler. Refused unless the request carries the cron secret.
export async function POST(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Not allowed", { status: 401 });
  }
  // Open the new periods and mark overdue ones first, so reminders see the current state.
  const now = new Date();
  const opened = await openAllPeriods(now);
  const result = await sendReminders(now, smtpMailer());
  return Response.json({ ...result, opened: opened.created, failedToOpen: opened.failed });
}
