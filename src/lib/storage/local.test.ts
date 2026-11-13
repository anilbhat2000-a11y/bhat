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
