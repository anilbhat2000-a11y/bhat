// Session cookies are Secure in production. Set COOKIE_SECURE=false only when the app is
// served over plain HTTP on a non-localhost host, because browsers drop Secure cookies there.
export function cookieSecure(env: { NODE_ENV?: string; COOKIE_SECURE?: string }): boolean {
  if (env.COOKIE_SECURE === "true") return true;
  if (env.COOKIE_SECURE === "false") return false;
  return env.NODE_ENV === "production";
}
