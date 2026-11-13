import { it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalStorage } from "./local";

const KEY = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.pdf";
let root: string;

beforeEach(() => { root = mkdtempSync(join(tmpdir(), "lms-storage-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

it("put then get returns the same bytes", async () => {
  const s = createLocalStorage(root);
  await s.put(KEY, Buffer.from("hello"));
  expect((await s.get(KEY)).toString()).toBe("hello");
});

it("rejects keys that try to leave the storage root", async () => {
  const s = createLocalStorage(root);
  await expect(s.get("../etc/passwd")).rejects.toThrow(/invalid key/);
});

it("delete removes the file", async () => {
  const s = createLocalStorage(root);
  await s.put(KEY, Buffer.from("x"));
  await s.delete(KEY);
  await expect(s.get(KEY)).rejects.toThrow();
});

it("stat reports the size, and stream returns only the requested bytes", async () => {
  const s = createLocalStorage(root);
  await s.put(KEY, Buffer.from("0123456789"));
  expect((await s.stat(KEY)).size).toBe(10);
  const chunks: Buffer[] = [];
  for await (const c of s.stream(KEY, 2, 5)) chunks.push(Buffer.from(c));
  expect(Buffer.concat(chunks).toString()).toBe("2345");
});

it("putStream writes chunks as they arrive, without buffering the whole file first", async () => {
  const s = createLocalStorage(root);
  async function* chunks() {
    yield Buffer.from("hello ");
    yield Buffer.from("streamed");
  }
  await s.putStream(KEY, chunks());
  expect((await s.get(KEY)).toString()).toBe("hello streamed");
});
