import { Suspense } from "react";
import { PortalGate } from "../../components/PortalGate";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalGate allowed={["EMPLOYEE", "MANAGER", "ADMIN"]}>{children}</PortalGate>
    </Suspense>
  );
}
