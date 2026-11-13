import { connection } from "next/server";
import { sendReminders } from "../../../../lib/notifications/send";
import { smtpMailer } from "../../../../lib/notifications/mailer";

// Called by the scheduler. Refused unless the request carries the cron secret.
export async function POST(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Not allowed", { status: 401 });
  }
  const result = await sendReminders(new Date(), smtpMailer());
  return Response.json(result);
}
