import { execFile } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import type { FileStorage } from "./types";

// Converts a stored lesson file into a format browsers can show, and stores the result under
// a new key. Office files become PDF (LibreOffice, headless, macros never run); MOV and MKV
// become MP4 (ffmpeg: a fast copy of the streams when they are already MP4-compatible,
// otherwise a re-encode to H.264/AAC). Works on temporary copies; the original is untouched.

const SOFFICE = () => process.env.SOFFICE_PATH || "soffice";
const FFMPEG = () => process.env.FFMPEG_PATH || "ffmpeg";

function run(cmd: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (err, _out, stderr) => {
      if (!err) return resolve();
      const missing = (err as NodeJS.ErrnoException).code === "ENOENT";
      reject(new Error(missing ? `${cmd} is not installed on the server` : `${cmd} failed: ${String(stderr).slice(-400) || err.message}`));
    });
  });
}

export type ConvertResult = { ok: true; key: string } | { ok: false; reason: string };

export async function convertStoredFile(storage: FileStorage, sourceKey: string, target: "pdf" | "mp4"): Promise<ConvertResult> {
  const dir = await mkdtemp(join(tmpdir(), "lms-convert-"));
  try {
    const ext = sourceKey.split(".").pop() ?? "";
    const input = join(dir, `input.${ext}`);
    const { size } = await storage.stat(sourceKey);
    await pipeline(Readable.from(storage.stream(sourceKey, 0, Math.max(0, size - 1))), createWriteStream(input));

    let output: string;
    if (target === "pdf") {
      const outDir = join(dir, "out");
      // A private LibreOffice profile per run avoids lock clashes between conversions.
      await run(SOFFICE(), [
        `-env:UserInstallation=file://${join(dir, "profile")}`,
        "--headless", "--norestore", "--nolockcheck", "--convert-to", "pdf", "--outdir", outDir, input,
      ], 5 * 60_000);
      const produced = (await readdir(outDir).catch(() => [] as string[])).find((f) => f.endsWith(".pdf"));
      if (!produced) return { ok: false, reason: "LibreOffice produced no PDF" };
      output = join(outDir, produced);
    } else {
      output = join(dir, "output.mp4");
      try {
        await run(FFMPEG(), ["-y", "-v", "error", "-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-c", "copy", "-movflags", "+faststart", output], 10 * 60_000);
      } catch (e) {
        if ((e as Error).message.includes("not installed")) throw e;
        await run(FFMPEG(), ["-y", "-v", "error", "-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
          "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output], 60 * 60_000);
      }
    }
    if ((await stat(output)).size === 0) return { ok: false, reason: "The converted file is empty" };
    const key = `${randomUUID()}.${target}`;
    await storage.putStream(key, createReadStream(output));
    return { ok: true, key };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Converts an old-format Office file held in memory (.xls or .doc) to its modern equivalent
// (.xlsx or .docx), so it can be read by the spreadsheet and Word readers.
export async function convertOfficeBuffer(data: Buffer, fromExt: "xls" | "doc", toExt: "xlsx" | "docx"): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "lms-convert-"));
  try {
    const input = join(dir, `input.${fromExt}`);
    await pipeline(Readable.from([data]), createWriteStream(input));
    const outDir = join(dir, "out");
    await run(SOFFICE(), [`-env:UserInstallation=file://${join(dir, "profile")}`, "--headless", "--norestore", "--nolockcheck", "--convert-to", toExt, "--outdir", outDir, input], 2 * 60_000);
    const produced = (await readdir(outDir).catch(() => [] as string[])).find((f) => f.endsWith(`.${toExt}`));
    if (!produced) throw new Error(`LibreOffice could not convert the .${fromExt} file`);
    const chunks: Buffer[] = [];
    for await (const c of createReadStream(join(outDir, produced))) chunks.push(c as Buffer);
    return Buffer.concat(chunks);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
