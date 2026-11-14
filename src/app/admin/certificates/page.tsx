import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { certificateOverview, parseDuration } from "../../../lib/reports/lms-dashboard";
import { CertificatesView } from "../../../components/CertificatesView";

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<{ duration?: string; q?: string }> }) {
  await connection();
  const viewer = await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const duration = sp.duration ? parseDuration(sp.duration) : "all";
  const q = (sp.q ?? "").slice(0, 100);
  const data = await certificateOverview(viewer, { duration, q });
  return (
    <main className="page">
      <h1>Certificates</h1>
      <p>Certificates are free and issued automatically by the portal when someone passes an annual certification assessment. Each has a QR code and a public verification page.</p>
      <p className="no-print"><a href="/api/export/certifications">Download every certificate (CSV)</a></p>
      <CertificatesView data={data} duration={duration} q={q} canDownload={true} />
    </main>
  );
}
