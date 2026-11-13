import { it, expect } from "vitest";
import { validateUpload } from "./validate";

const MB = 1024 * 1024;

it("accepts a PDF document under the limit", () => {
  const r = validateUpload({ filename: "guide.pdf", mime: "application/pdf", sizeBytes: 1 * MB }, "DOCUMENT");
  expect(r.ok).toBe(true);
});

it("rejects a wrong MIME type for a document (Review Focus 3)", () => {
  const r = validateUpload({ filename: "page.html", mime: "text/html", sizeBytes: 1000 }, "DOCUMENT");
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.reason).toMatch(/type/i);
});

it("rejects a 51 MB PDF with a size reason (Review Focus 3)", () => {
  const r = validateUpload({ filename: "big.pdf", mime: "application/pdf", sizeBytes: 51 * MB }, "DOCUMENT");
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.reason).toMatch(/size/i);
});

it("generated key is a UUID plus the safe extension, never the original filename", () => {
  const r = validateUpload({ filename: "../../secret name.pdf", mime: "application/pdf", sizeBytes: 10 }, "DOCUMENT");
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.key).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(r.key).not.toContain("secret");
  }
});

it("accepts PNG and JPEG images, with the photo size limit", () => {
  expect(validateUpload({ filename: "a.png", mime: "image/png", sizeBytes: 1 * MB }, "IMAGE").ok).toBe(true);
  expect(validateUpload({ filename: "a.jpg", mime: "image/jpeg", sizeBytes: 1 * MB }, "IMAGE").ok).toBe(true);
  const big = validateUpload({ filename: "a.jpg", mime: "image/jpeg", sizeBytes: 6 * MB }, "IMAGE");
  expect(big.ok).toBe(false);
});

it("accepts a WebVTT caption file (spec 6B) under 1 MB", () => {
  const r = validateUpload({ filename: "captions.vtt", mime: "text/vtt", sizeBytes: 1000 }, "CAPTION");
  expect(r.ok).toBe(true);
});
