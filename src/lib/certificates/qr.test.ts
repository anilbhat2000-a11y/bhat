import { it, expect } from "vitest";
import jsQR from "jsqr";
import { qrMatrix, verifyUrl } from "./qr";

// Paints the matrix into an RGBA image (4 px per module, 4-module quiet zone) and decodes it,
// proving the drawn squares encode the URL.
function decode(matrix: boolean[][]): string | null {
  const scale = 4;
  const size = (matrix.length + 8) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (!dark) return;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = (((y + 4) * scale + dy) * size + (x + 4) * scale + dx) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }));
  return jsQR(data, size, size)?.data ?? null;
}

it("draws a QR code that decodes to the verification address", () => {
  const url = "https://lms.3cit.local/verify/ABCD2345EFGH";
  expect(decode(qrMatrix(url))).toBe(url);
});

it("builds the address from PUBLIC_BASE_URL, or else from the request behind the proxy", () => {
  expect(verifyUrl("ABC", { baseUrl: "https://lms.3cit.local/" })).toBe("https://lms.3cit.local/verify/ABC");
  const headers = new Headers({ host: "app:3000", "x-forwarded-host": "lms.office:8443", "x-forwarded-proto": "https" });
  expect(verifyUrl("ABC", { baseUrl: "", requestUrl: "http://app:3000/api/certificates/1", headers })).toBe("https://lms.office:8443/verify/ABC");
  expect(verifyUrl("ABC", { requestUrl: "http://localhost:3000/x" })).toBe("http://localhost:3000/verify/ABC");
});
