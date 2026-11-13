import QRCode from "qrcode";

// The QR code's dark/light modules as rows of booleans. Drawn as vector squares on the
// certificate, so it prints sharply at any size and needs no image library.
export function qrMatrix(text: string): boolean[][] {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const rows: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) row.push(qr.modules.get(y, x) === 1);
    rows.push(row);
  }
  return rows;
}

// The public verification address printed on certificates. PUBLIC_BASE_URL is the address
// staff use (for example https://lms.3cit.local); without it, the address of the request.
export function verifyUrl(code: string, opts: { baseUrl?: string | null; requestUrl?: string; headers?: Headers }): string {
  let base = opts.baseUrl?.trim().replace(/\/+$/, "") || "";
  if (!base && opts.requestUrl) {
    const url = new URL(opts.requestUrl);
    const host = opts.headers?.get("x-forwarded-host") ?? opts.headers?.get("host") ?? url.host;
    const proto = opts.headers?.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    base = `${proto}://${host}`;
  }
  return `${base}/verify/${encodeURIComponent(code)}`;
}
