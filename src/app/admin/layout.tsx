import { Suspense } from "react";
import { PortalGate } from "../../components/PortalGate";
import { PortalHeader } from "../../components/PortalHeader";
import { SideNav } from "../../components/SideNav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <div className="shell">
        <PortalHeader portal="admin" />
        <div className="shell-body">
          <SideNav portal="admin" />
          <div className="shell-main">
            <PortalGate allowed={["ADMIN"]}>{children}</PortalGate>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
