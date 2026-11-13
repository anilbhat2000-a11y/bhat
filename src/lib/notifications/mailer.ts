import nodemailer from "nodemailer";

export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

// Sends through the SMTP server in SMTP_URL. Tests inject a fake Mailer instead.
export function smtpMailer(url: string | undefined = process.env.SMTP_URL): Mailer {
  if (!url) throw new Error("SMTP_URL is not set");
  const transport = nodemailer.createTransport(url);
  return {
    async send(to, subject, body) {
      await transport.sendMail({ from: process.env.MAIL_FROM ?? "3C LMS <no-reply@3c.example>", to, subject, text: body });
    },
  };
}
