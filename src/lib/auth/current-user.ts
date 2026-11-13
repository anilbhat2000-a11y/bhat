import { cookies } from "next/headers";
import { readSession, type SessionUser } from "./session";
import { AuthError } from "./guards";

export const SESSION_COOKIE = "lms_session";

// Reads the signed-in user from the request cookie, or throws AuthError(401).
export async function requireSession(): Promise<SessionUser> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const user = token ? await readSession(token) : null;
  if (!user) throw new AuthError(401);
  return user;
}
