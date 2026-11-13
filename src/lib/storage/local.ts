import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { FileStorage } from "./types";

// Keys produced by validateUpload: a UUID plus one of the allowed extensions.
const KEY_PATTERN = /^[0-9a-f-]{36}\.(pdf|mp4|png|jpg|vtt)$/;

export function createLocalStorage(rootDir: string): FileStorage {
  const root = resolve(rootDir);

  function pathFor(key: string): string {
    if (!KEY_PATTERN.test(key)) throw new Error("invalid key");
    const full = resolve(root, key);
    if (!full.startsWith(root + sep)) throw new Error("invalid key");
    return full;
  }

  return {
    async put(key, data) {
      const full = pathFor(key);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, data);
    },
    async get(key) {
      return readFile(pathFor(key));
    },
    async delete(key) {
      await rm(pathFor(key), { force: true });
    },
    async stat(key) {
      const info = await stat(pathFor(key));
      return { size: info.size };
    },
    stream(key, start, end) {
      return createReadStream(pathFor(key), { start, end });
    },
  };
}
