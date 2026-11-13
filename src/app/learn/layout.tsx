import { Suspense } from "react";
import { PortalGate } from "../../components/PortalGate";
import { SignOut } from "../../components/SignOut";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SignOut />
      <PortalGate allowed={["EMPLOYEE", "MANAGER", "ADMIN"]}>{children}</PortalGate>
    </Suspense>
  );
}
