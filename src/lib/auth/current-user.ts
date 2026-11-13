import { cookies } from "next/headers";
import { readSession, type SessionUser } from "./session";
import { AuthError } from "./guards";

export const SESSION_COOKIE = "lms_session";

// The signed-in user, or null when there is no valid session.
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? readSession(token) : null;
}

// Reads the signed-in user, or throws AuthError(401).
export async function requireSession(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new AuthError(401);
  return user;
}
