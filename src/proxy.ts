import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "./lib/auth/session";
import { canViewUser } from "./lib/auth/guards";
import { prisma } from "./lib/db/client";

const FORBIDDEN_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not allowed</title></head>
<body style="font-family:system-ui,sans-serif;padding:16px"><h1>You do not have access to this record</h1>
<p><a href="/manager/team">Back to my team</a></p></body></html>`;

// Runs before any page renders. Checks the session cookie, and refuses a manager's request
// for a team member outside their reporting line with a real 403, which a streamed page
// cannot give once its shell has been sent.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get("lms_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  const member = /^\/manager\/team\/([^/]+)$/.exec(request.nextUrl.pathname);
  if (member && member[1] !== "summary") {
    const viewer = await readSession(token);
    if (!viewer) return NextResponse.redirect(new URL("/login", request.url));
    if (viewer.role === "ADMIN" || viewer.role === "MANAGER") {
      const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
      if (!canViewUser(viewer, member[1], all)) {
        return new NextResponse(FORBIDDEN_PAGE, { status: 403, headers: { "content-type": "text/html; charset=utf-8" } });
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/learn/:path*"],
};
