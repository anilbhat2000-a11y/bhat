import Link from "next/link";
import { logout } from "../app/actions/auth";
import { LOGO_URL, PORTAL_NAME } from "../lib/brand";

// The bar at the top of every portal page: the company logo (a link home) and sign out.
// The sign-out button is a plain form, so it works without JavaScript.
export function PortalHeader({ home }: { home: string }) {
  return (
    <header className="portal-header">
      <Link href={home} className="brand-link" aria-label={`${PORTAL_NAME}: home`}>
        <span className="logo-chip">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small local PNG; no image optimiser needed */}
          <img src={LOGO_URL} alt="3C ITS logo" width={160} height={50} />
        </span>
        <span className="portal-name">{PORTAL_NAME}</span>
      </Link>
      <form action={logout}>
        <button type="submit">Sign out</button>
      </form>
    </header>
  );
}
