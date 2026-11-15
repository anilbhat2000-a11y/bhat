// Extra response headers for a stored file. HTML pages (uploaded by admins, for example an
// interactive slide deck) run in a sandbox with no access to the portal: the browser treats
// them as coming from a unique, unknown origin, so their scripts cannot read the session
// cookie, call portal APIs or change the page around them.
export function safetyHeaders(mime: string): Record<string, string> {
  const base = { "x-content-type-options": "nosniff" };
  if (mime === "text/html") {
    return { ...base, "content-type": "text/html; charset=utf-8", "content-security-policy": "sandbox allow-scripts allow-popups allow-forms allow-modals allow-downloads", "referrer-policy": "no-referrer" };
  }
  return base;
}
