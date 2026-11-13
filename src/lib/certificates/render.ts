import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Level } from "../../generated/prisma/client";

// Standard PDF fonts only cover Latin text, so other characters are shown as '?'.
const plain = (s: string) => s.replace(/[^\x20-\x7E]/g, "?");
const date = (d: Date) => d.toISOString().slice(0, 10);

export async function renderCertificatePdf(data: {
  holderName: string;
  subject: string;
  level: Level;
  issuedAt: Date;
  expiresAt: Date;
  code: string;
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.1, 0.1, 0.2);

  page.drawText("Certificate of Completion", { x: 60, y: 470, size: 34, font: bold, color: ink });
  page.drawText(plain(data.holderName), { x: 60, y: 390, size: 28, font: bold, color: ink });
  page.drawText(`${plain(data.subject)}, ${data.level.toLowerCase()} level`, { x: 60, y: 335, size: 20, font, color: ink });
  page.drawText(`Issued ${date(data.issuedAt)}. Valid until ${date(data.expiresAt)}.`, { x: 60, y: 290, size: 14, font, color: ink });
  page.drawText(`Verification code: ${data.code}`, { x: 60, y: 90, size: 14, font: bold, color: ink });
  page.drawText(`Check this certificate at /verify/${data.code}`, { x: 60, y: 70, size: 11, font, color: ink });

  return Buffer.from(await doc.save());
}
