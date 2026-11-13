import { Suspense } from "react";
import { PortalGate } from "../../components/PortalGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalGate allowed={["ADMIN"]}>{children}</PortalGate>
    </Suspense>
  );
}
