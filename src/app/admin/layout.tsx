import { Suspense } from "react";
import { PortalGate } from "../../components/PortalGate";
import { PortalHeader } from "../../components/PortalHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalHeader home="/admin" />
      <PortalGate allowed={["ADMIN"]}>{children}</PortalGate>
    </Suspense>
  );
}
