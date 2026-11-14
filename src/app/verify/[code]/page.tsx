import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "../../../lib/db/client";
import { verificationView } from "../../../lib/certificates/verify";

// Public: no sign-in. Shows validity, name, subject, level, and dates only.
export default function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={null}>
      <VerifyContent params={params} />
    </Suspense>
  );
}

async function VerifyContent({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const { code } = await params;
  const cert = await prisma.certification.findUnique({ where: { verificationCode: code.toUpperCase() }, include: { user: true, subject: true } });
  if (!cert) {
    return (
      <main className="page">
        <h1>No certificate matches this code</h1>
      </main>
    );
  }
  const v = verificationView(
    { holderName: cert.user.name, subject: cert.subject.name, level: cert.level, issuedAt: cert.issuedAt, expiresAt: cert.expiresAt },
    new Date(),
  );
  return (
    <main className="page">
      <h1>{v.valid ? "Valid certificate" : "Expired certificate"}</h1>
      <p>Holder: {v.holderName}</p>
      <p>Subject: {v.subject} ({v.level.toLowerCase()})</p>
      <p>Issued: {v.issuedAt.toISOString().slice(0, 10)}</p>
      <p>Valid until: {v.expiresAt.toISOString().slice(0, 10)}</p>
    </main>
  );
}
