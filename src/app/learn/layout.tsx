import { Suspense } from "react";
import { PortalGate } from "../../components/PortalGate";
import { PortalHeader } from "../../components/PortalHeader";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalHeader home="/learn" />
      <PortalGate allowed={["EMPLOYEE", "MANAGER", "ADMIN"]}>{children}</PortalGate>
    </Suspense>
  );
}
