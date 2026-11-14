import Link from "next/link";
import { logout } from "../app/actions/auth";
import { currentUser } from "../lib/auth/current-user";
import { LOGO_URL, PORTAL_NAME } from "../lib/brand";

const PORTAL_LABEL = { admin: "Admin portal", manager: "Manager portal", learn: "Learning" } as const;

// The top bar of every portal page: logo (a link home), the portal's name, links to the
// other portals the user may use, the signed-in user, and sign out. Sign out is a plain
// form, so it works without JavaScript.
export async function PortalHeader({ portal }: { portal: keyof typeof PORTAL_LABEL }) {
  const user = await currentUser();
  const switches = [
    user?.role === "ADMIN" && portal !== "admin" ? { href: "/admin", label: "Admin portal" } : null,
    (user?.role === "MANAGER" || user?.role === "ADMIN") && portal !== "manager" ? { href: "/manager/team", label: "Manager portal" } : null,
    portal !== "learn" ? { href: "/learn", label: "My learning" } : null,
  ].filter((x): x is { href: string; label: string } => x !== null);
  const initials = (user?.name ?? "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="topbar">
      <Link href={portal === "manager" ? "/manager/team" : `/${portal}`} className="brand-link" title="Home">
        <span className="logo-chip">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small local PNG; no image optimiser needed */}
          <img src={LOGO_URL} alt="3C ITS logo" width={160} height={50} />
        </span>
        <span className="brand-text">
          <span className="portal-name">{PORTAL_NAME}</span>
          <span className="portal-sub">{PORTAL_LABEL[portal]}</span>
        </span>
      </Link>
      <div className="topbar-right">
        {switches.length > 0 ? (
          <nav aria-label="Switch portal" className="portal-switch">
            {switches.map((s) => <Link key={s.href} href={s.href}>{s.label}</Link>)}
          </nav>
        ) : null}
        {user ? (
          <span className="user-chip" title={user.email}>
            <span className="avatar" aria-hidden="true">{initials}</span>
            <span className="user-name">{user.name}</span>
          </span>
        ) : null}
        <form action={logout} className="inline-form">
          <button type="submit" className="btn-ghost">Sign out</button>
        </form>
      </div>
    </header>
  );
}
