import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Level } from "../../generated/prisma/client";
import { qrMatrix } from "./qr";

import { LEGAL_NAME, LOGO_FILE } from "../brand";

export const ISSUER = LEGAL_NAME;

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const BLUE = hex("#1701c1");
const GREEN = hex("#007969");
const TEAL = hex("#50beab");

// Read once per process; a missing file leaves the certificate without the logo rather
// than failing the download.
let logoBytes: Buffer | null | undefined;
function logo(): Buffer | null {
  if (logoBytes === undefined) {
    try {
      logoBytes = readFileSync(join(process.cwd(), LOGO_FILE));
    } catch {
      logoBytes = null;
    }
  }
  return logoBytes;
}

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

  // Brand frame: a green border with a teal inner line.
  page.drawRectangle({ x: 20, y: 20, width: 802, height: 555, borderColor: GREEN, borderWidth: 6 });
  page.drawRectangle({ x: 32, y: 32, width: 778, height: 531, borderColor: TEAL, borderWidth: 1.5 });

  const bytes = logo();
  if (bytes) {
    const img = await doc.embedPng(bytes);
    const height = 70;
    const width = (img.width / img.height) * height;
    page.drawImage(img, { x: 60, y: 478, width, height });
  }

  page.drawText("Certificate of Completion", { x: 60, y: 420, size: 32, font: bold, color: BLUE });
  page.drawText("This certifies that", { x: 60, y: 385, size: 13, font, color: ink });
  page.drawText(plain(data.holderName), { x: 60, y: 345, size: 28, font: bold, color: ink });
  page.drawText(`has completed ${plain(data.subject)}, ${data.level.toLowerCase()} level`, { x: 60, y: 305, size: 18, font, color: ink });
  page.drawText(`Issued ${date(data.issuedAt)}. Valid until ${date(data.expiresAt)}.`, { x: 60, y: 270, size: 13, font, color: ink });
  page.drawLine({ start: { x: 60, y: 240 }, end: { x: 480, y: 240 }, thickness: 1, color: TEAL });
  page.drawText(`Issued by ${plain(ISSUER)}`, { x: 60, y: 220, size: 12, font: bold, color: GREEN });
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
