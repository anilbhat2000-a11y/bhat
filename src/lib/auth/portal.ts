import { redirect } from "next/navigation";
import type { Role } from "../../generated/prisma/client";
import { connection } from "next/server";
import { currentUser } from "./current-user";
import type { SessionUser } from "./session";

// Where each role lands. A user who opens a portal they may not use is sent here.
export const HOME: Record<Role, string> = {
  ADMIN: "/admin",
  MANAGER: "/manager",
  EMPLOYEE: "/learn",
};

// For portal layouts: no session goes to /login; a wrong role goes to that role's home.
// redirect() throws internally, so it must not sit inside a try block.
export async function guardPortal(allowed: Role[]): Promise<SessionUser> {
  await connection(); // the portal depends on the request cookie, so never prerender it
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!allowed.includes(user.role)) redirect(HOME[user.role]);
  return user;
}
