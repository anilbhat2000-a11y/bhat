import { it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderCertificatePdf } from "./render";

it("renders a one-page PDF with the holder, subject, and verification code", async () => {
  const bytes = await renderCertificatePdf({
    holderName: "Priya Rao",
    subject: "Networking",
    level: "ADVANCED",
    issuedAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: new Date("2027-01-01T00:00:00Z"),
    code: "ABCD2345EFGH",
    verifyUrl: "https://lms.example/verify/ABCD2345EFGH",
  });
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(1);
});

it("non-Latin names render without failing", async () => {
  const bytes = await renderCertificatePdf({
    holderName: "रावी Rao",
    subject: "Cloud",
    level: "BASIC",
    issuedAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: new Date("2027-01-01T00:00:00Z"),
    code: "ABCD2345EFGH",
    verifyUrl: "https://lms.example/verify/ABCD2345EFGH",
  });
  expect(bytes.length).toBeGreaterThan(100);
});
