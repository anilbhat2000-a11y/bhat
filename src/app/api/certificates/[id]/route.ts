import { connection } from "next/server";
import { currentUser } from "../../../../lib/auth/current-user";
import { prisma } from "../../../../lib/db/client";
import { renderCertificatePdf } from "../../../../lib/certificates/render";
import { verifyUrl } from "../../../../lib/certificates/qr";

// The holder and admins can download a certificate. Everyone else gets 404, so the
// response does not reveal whether the certificate exists.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const { id } = await params;
  const cert = await prisma.certification.findUnique({ where: { id }, include: { user: true, subject: true } });
  if (!cert || (cert.userId !== user.id && user.role !== "ADMIN")) return new Response("Not found", { status: 404 });

  const pdf = await renderCertificatePdf({
    holderName: cert.user.name,
    subject: cert.subject.name,
    level: cert.level,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    code: cert.verificationCode,
    verifyUrl: verifyUrl(cert.verificationCode, { baseUrl: process.env.PUBLIC_BASE_URL, requestUrl: request.url, headers: request.headers }),
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="certificate-${cert.verificationCode}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
