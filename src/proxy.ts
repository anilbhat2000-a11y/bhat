import { NextResponse, type NextRequest } from "next/server";

// Fast first check only: a missing cookie goes to /login. The real check, including
// deactivated users and roles, runs in each portal layout via guardPortal().
export function proxy(request: NextRequest) {
  if (!request.cookies.get("lms_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/learn/:path*"],
};
