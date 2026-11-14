import { FORMATS } from "./formats";
import { createLocalStorage } from "./local";
import type { FileStorage } from "./types";

// The process-wide storage. Swapping in S3 later changes only this module.
let instance: FileStorage | null = null;

export function defaultStorage(): FileStorage {
  instance ??= createLocalStorage(process.env.FILE_STORAGE_DIR ?? "./storage");
  return instance;
}

const MIME_BY_EXT: Record<string, string> = {
  ...Object.fromEntries(FORMATS.map((f) => [f.ext, f.mime])),
  pdf: "application/pdf",
  mp4: "video/mp4",
  png: "image/png",
  jpg: "image/jpeg",
  vtt: "text/vtt",
};

export function mimeForKey(key: string): string {
  const ext = key.split(".").pop() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}
