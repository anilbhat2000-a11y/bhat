import { Suspense } from "react";
import { PortalGate } from "../../components/PortalGate";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalGate allowed={["MANAGER", "ADMIN"]}>{children}</PortalGate>
    </Suspense>
  );
}
