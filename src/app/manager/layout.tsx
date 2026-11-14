import { Suspense } from "react";
import { PortalGate } from "../../components/PortalGate";
import { PortalHeader } from "../../components/PortalHeader";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalHeader home="/manager" />
      <PortalGate allowed={["MANAGER", "ADMIN"]}>{children}</PortalGate>
    </Suspense>
  );
}
