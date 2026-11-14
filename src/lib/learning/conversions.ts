import { prisma } from "../db/client";
import { defaultStorage } from "../storage";
import type { FileStorage } from "../storage/types";
import { convertStoredFile } from "../storage/convert";
import { FORMATS } from "../storage/formats";

// Background conversion of lesson files (Office to PDF, MOV/MKV to MP4), one at a time, in
// the server process. Pending conversions are picked up again when the server starts
// (instrumentation.ts) and whenever an admin opens a course, so a restart loses nothing.

const queue: string[] = [];
const queued = new Set<string>();
let running = false;
let storageForTests: FileStorage | null = null;

export function useStorageForConversions(storage: FileStorage | null) {
  storageForTests = storage;
}

export function queueConversion(lessonId: string): void {
  if (queued.has(lessonId)) return;
  queued.add(lessonId);
  queue.push(lessonId);
  if (!running) void drain();
}

async function drain(): Promise<void> {
  running = true;
  try {
    while (queue.length > 0) {
      const id = queue.shift() as string;
      try {
        await convertLesson(id);
      } catch (e) {
        console.error("lesson conversion failed", id, (e as Error).message);
      } finally {
        queued.delete(id);
      }
    }
  } finally {
    running = false;
  }
}

// Converts one lesson's original file and points the lesson at the result. On failure,
// an Office file stays a download-only document; a video keeps playing its original.
export async function convertLesson(lessonId: string): Promise<"DONE" | "FAILED" | "SKIPPED"> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, sourceFileKey: true, conversion: true, type: true } });
  if (!lesson || lesson.conversion !== "PENDING" || !lesson.sourceFileKey) return "SKIPPED";
  const ext = lesson.sourceFileKey.split(".").pop() ?? "";
  const target = FORMATS.find((f) => f.ext === ext)?.convertTo;
  if (!target) {
    await prisma.lesson.update({ where: { id: lessonId }, data: { conversion: "FAILED" } });
    return "FAILED";
  }
  const storage = storageForTests ?? defaultStorage();
  const result = await convertStoredFile(storage, lesson.sourceFileKey, target);
  if (!result.ok) {
    console.error("lesson conversion failed", lessonId, result.reason);
    await prisma.lesson.update({ where: { id: lessonId }, data: { conversion: "FAILED" } });
    return "FAILED";
  }
  // The lesson may have been deleted while converting; then drop the converted file.
  const updated = await prisma.lesson.updateMany({
    where: { id: lessonId, conversion: "PENDING" },
    data: { fileKey: result.key, conversion: "DONE", type: target === "pdf" ? "PDF" : "VIDEO" },
  });
  if (updated.count === 0) await storage.delete(result.key);
  return updated.count > 0 ? "DONE" : "SKIPPED";
}

export async function resumePendingConversions(courseId?: string): Promise<number> {
  const pending = await prisma.lesson.findMany({ where: { conversion: "PENDING", ...(courseId ? { courseId } : {}) }, select: { id: true } });
  for (const p of pending) queueConversion(p.id);
  return pending.length;
}

// For tests: wait until the queue is empty.
export async function conversionsIdle(timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  while ((running || queue.length > 0) && Date.now() - start < timeoutMs) await new Promise((r) => setTimeout(r, 100));
}
