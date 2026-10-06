import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

/** One cached model response. */
export interface CacheEntry<T> {
  /** When the entry was written, in milliseconds since the epoch. Pruning removes the oldest first. */
  timestamp: number;
  /** How long the model call took. Every hit on the entry saves this much. */
  durationMs: number;
  result: T;
}

/**
 * A directory of JSON files, one per entry, named by key.
 *
 * Concurrent writers, in one process or in several, keep each other's entries, a read parses only
 * the entry it asks for, and two branches that add entries merge without a conflict. A write goes
 * to a temporary file that is then renamed into place, so a reader sees a whole entry or none.
 * When the directory grows past `maxSize`, the oldest entries are removed.
 */
export class FileCache<T> {
  private readonly maxSize: number;
  /** Bytes in the directory: counted on the first write, then kept up to date by this instance. */
  private size: number | undefined;

  constructor(
    private readonly dir: string,
    { maxSize = DEFAULT_MAX_SIZE }: { maxSize?: number } = {}
  ) {
    this.maxSize = maxSize;
  }

  async get(key: string): Promise<CacheEntry<T> | undefined> {
    const text = await readOrUndefined(this.file(key));
    return text === undefined ? undefined : (JSON.parse(text) as CacheEntry<T>);
  }

  async set(key: string, entry: CacheEntry<T>): Promise<void> {
    const json = `${JSON.stringify(entry, null, 2)}\n`;

    await fs.mkdir(this.dir, { recursive: true });
    this.size ??= await this.measure();

    const temporary = path.join(this.dir, `.${key}.${randomUUID()}.tmp`);
    await fs.writeFile(temporary, json);
    await fs.rename(temporary, this.file(key));

    this.size += Buffer.byteLength(json, "utf-8");
    if (this.size > this.maxSize) await this.prune();
  }

  private file(key: string): string {
    return path.join(this.dir, `${key}.json`);
  }

  private async entryFiles(): Promise<string[]> {
    const names = await fs.readdir(this.dir);
    return names.filter((name) => name.endsWith(".json")).map((name) => path.join(this.dir, name));
  }

  private async measure(): Promise<number> {
    let size = 0;
    for (const file of await this.entryFiles()) {
      size += (await statOrUndefined(file))?.size ?? 0;
    }
    return size;
  }

  private async prune(): Promise<void> {
    const entries: { file: string; size: number; timestamp: number }[] = [];
    for (const file of await this.entryFiles()) {
      const [stat, text] = await Promise.all([statOrUndefined(file), readOrUndefined(file)]);
      // Another process removed it after the listing.
      if (!stat || text === undefined) continue;
      entries.push({ file, size: stat.size, timestamp: (JSON.parse(text) as CacheEntry<T>).timestamp });
    }

    entries.sort((a, b) => a.timestamp - b.timestamp);
    let size = entries.reduce((total, entry) => total + entry.size, 0);
    for (const entry of entries) {
      if (size <= this.maxSize) break;
      await fs.rm(entry.file, { force: true });
      size -= entry.size;
    }
    this.size = size;
  }
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

async function statOrUndefined(file: string) {
  try {
    return await fs.stat(file);
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

async function readOrUndefined(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, "utf-8");
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}
