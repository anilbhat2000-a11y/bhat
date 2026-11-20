import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { getMailSettings, mailSource } from "../../../../lib/notifications/mail-settings";
import { saveMailSettingsAction, sendTestEmailAction } from "../../../actions/mail-settings";

const PRESETS = [
  { name: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: 587, security: "STARTTLS", note: "User name = the full mailbox address. SMTP AUTH must be allowed for that mailbox (Microsoft 365 admin centre → user → Mail → Manage email apps)." },
  { name: "Google Workspace / Gmail", host: "smtp.gmail.com", port: 587, security: "STARTTLS", note: "Use an App password (Google account → Security → 2-Step Verification → App passwords), not the normal password." },
  { name: "Zoho Mail (India)", host: "smtp.zoho.in", port: 587, security: "STARTTLS", note: "User name = the full mailbox address. Use an app-specific password if two-factor sign-in is on." },
  { name: "Company mail server", host: "mail.yourcompany.com", port: 587, security: "STARTTLS", note: "Ask your IT team for the server name, port, and a mailbox the LMS may send from." },
];

// Admin → Email settings: the mail server the portal sends from (reminders, announcements,
// password reset links), with a test button.
export default async function EmailSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  const actor = await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const [s, source] = await Promise.all([getMailSettings(), mailSource()]);
  const status = source === "SETTINGS" ? { cls: "mail-on", text: `Email is on. The portal sends from ${s.fromAddress} through ${s.host}.` }
    : source === "ENV" ? { cls: "mail-on", text: "Email is on, using SMTP_URL from the server's .env file. Settings saved and switched on here take its place." }
      : { cls: "mail-off", text: "Email is off. Reminders are not sent, announcements cannot be emailed, and \"Forgot password\" requests go to admins on the Users page." };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Email settings</h1>
          <p className="muted">The mail server the portal uses to send assessment and course reminders, announcement emails and password reset links. Use a mailbox such as <em>lms@yourcompany.com</em>, not a person&apos;s own mailbox.</p>
        </div>
      </div>
      {sp.error ? <p role="alert">{sp.error}</p> : null}
      {sp.notice ? <p role="status">{sp.notice}</p> : null}
      <p className={`mail-status ${status.cls}`} data-test="mail-status">{status.text}</p>

      <div className="mail-layout">
        <section className="card" aria-labelledby="h-server">
          <h2 id="h-server">Mail server (SMTP)</h2>
          <form action={saveMailSettingsAction} data-test="mail-settings" className="mail-form">
            <label className="field span-2"><span className="field-label">Server name (SMTP host)</span>
              <input name="host" defaultValue={s.host} required placeholder="smtp.office365.com" aria-label="SMTP host" autoComplete="off" />
            </label>
            <label className="field"><span className="field-label">Port</span>
              <input name="port" type="number" min={1} max={65535} defaultValue={s.port} required aria-label="Port" />
              <span className="field-help">Usually 587 (STARTTLS) or 465 (SSL).</span>
            </label>
            <label className="field"><span className="field-label">Security</span>
              <select name="security" defaultValue={s.security} aria-label="Security">
                <option value="STARTTLS">STARTTLS (port 587, recommended)</option>
                <option value="SSL">SSL/TLS (port 465)</option>
                <option value="NONE">None (internal relay only)</option>
              </select>
            </label>
            <label className="field"><span className="field-label">User name</span>
              <input name="username" defaultValue={s.username} placeholder="lms@yourcompany.com" aria-label="SMTP user name" autoComplete="off" />
              <span className="field-help">Leave empty only if the server needs no sign-in (an internal relay).</span>
            </label>
            <label className="field"><span className="field-label">Password</span>
              <input name="password" type="password" placeholder={s.hasPassword ? "Saved (leave empty to keep it)" : "Mailbox or app password"} aria-label="SMTP password" autoComplete="new-password" />
              <span className="field-help">Stored encrypted. Never shown again.</span>
            </label>
            <label className="field"><span className="field-label">Sender email address</span>
              <input name="fromAddress" type="email" defaultValue={s.fromAddress} required placeholder="lms@yourcompany.com" aria-label="Sender email address" />
            </label>
            <label className="field"><span className="field-label">Sender name</span>
              <input name="fromName" defaultValue={s.fromName} maxLength={80} aria-label="Sender name" />
            </label>
            <label className="span-2 mail-enable"><input type="checkbox" name="enabled" defaultChecked={s.enabled} /> Send email from the portal using these settings</label>
            <div className="form-actions span-2"><button type="submit" className="btn-primary">Save settings</button></div>
          </form>
        </section>

        <div className="mail-side">
          <section className="card" aria-labelledby="h-test">
            <h2 id="h-test">Send a test email</h2>
            <p className="muted">Uses the saved settings, even before they are switched on. Save first if you changed anything.</p>
            <form action={sendTestEmailAction} data-test="mail-test" className="mail-test">
              <label className="field"><span className="field-label">Send to</span><input name="to" type="email" required defaultValue={actor.email} aria-label="Test email address" /></label>
              <button type="submit" className="btn-primary" disabled={!s.host}>Send test email</button>
            </form>
          </section>

          <section className="card" aria-labelledby="h-presets">
            <h2 id="h-presets">Common settings</h2>
            <dl className="mail-presets">
              {PRESETS.map((p) => (
                <div key={p.name}>
                  <dt>{p.name}</dt>
                  <dd><code>{p.host}</code> · port <code>{p.port}</code> · {p.security}</dd>
                  <dd className="muted">{p.note}</dd>
                </div>
              ))}
            </dl>
            <p className="muted small-note">The LMS server must be allowed to make outgoing connections to the mail server on that port (ask IT to open it in the firewall if the test times out).</p>
          </section>
        </div>
      </div>
    </main>
  );
}
