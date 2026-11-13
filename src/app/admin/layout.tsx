import { Suspense } from "react";
import { PortalGate } from "../../components/PortalGate";
import { SignOut } from "../../components/SignOut";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SignOut />
      <PortalGate allowed={["ADMIN"]}>{children}</PortalGate>
    </Suspense>
  );
}
