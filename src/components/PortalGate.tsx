import type { Role } from "../generated/prisma/client";
import { guardPortal } from "../lib/auth/portal";

// Checks the session and role before rendering the portal. Wrapped in Suspense by the
// layout, because it reads the request (cacheComponents requires a boundary for that).
export async function PortalGate({ allowed, children }: { allowed: Role[]; children: React.ReactNode }) {
  await guardPortal(allowed);
  return <>{children}</>;
}
