// Storage is keyed by generated names only. Callers never choose a path.
export interface FileStorage {
  put(key: string, data: Buffer): Promise<void>;
  // Writes bytes as they arrive, so a large upload never has to fit in memory.
  putStream(key: string, source: AsyncIterable<Uint8Array>): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  stat(key: string): Promise<{ size: number }>;
  // Streams bytes start..end inclusive, so a range of a large file never loads the whole file.
  stream(key: string, start: number, end: number): AsyncIterable<Uint8Array>;
}
