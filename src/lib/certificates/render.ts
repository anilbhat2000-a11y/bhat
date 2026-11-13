import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Level } from "../../generated/prisma/client";
import { qrMatrix } from "./qr";

// [PLACEHOLDER] Confirm the exact legal name for certificates with the company.
export const ISSUER = "3C IT Solutions and Telecoms India Ltd";

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
  // Full address of the public verification page, encoded in the QR code.
  verifyUrl: string;
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
  page.drawText(`Issued by ${ISSUER}`, { x: 60, y: 250, size: 12, font, color: ink });
  page.drawText(`Verification code: ${data.code}`, { x: 60, y: 90, size: 14, font: bold, color: ink });
  page.drawText(`Scan the code or visit ${plain(data.verifyUrl)}`, { x: 60, y: 70, size: 10, font, color: ink });

  // QR code in the bottom-right corner, with the required light margin around it.
  const matrix = qrMatrix(data.verifyUrl);
  const box = 130;
  const cell = box / (matrix.length + 8);
  const left = 842 - 60 - box;
  const bottom = 50;
  page.drawRectangle({ x: left, y: bottom, width: box, height: box, color: rgb(1, 1, 1) });
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) {
      page.drawRectangle({ x: left + (x + 4) * cell, y: bottom + box - (y + 5) * cell, width: cell, height: cell, color: rgb(0, 0, 0) });
    }
  }));

  return Buffer.from(await doc.save());
}
