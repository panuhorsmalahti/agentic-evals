import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";

const DEFAULT_MAX_CACHE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type CacheEntry = { timestamp: number; value: LanguageModelV3GenerateResult };
type CacheStore = Record<string, CacheEntry>;

export class FileCache {
  private readonly maxSize: number;

  constructor(
    private readonly file: string,
    { maxSize = DEFAULT_MAX_CACHE_FILE_SIZE }: { maxSize?: number } = {}
  ) {
    this.maxSize = maxSize;
  }

  private async read(): Promise<CacheStore> {
    if (!existsSync(this.file)) return {};

    return JSON.parse(await fs.readFile(this.file, "utf-8")) as CacheStore;
  }

  private prune(store: CacheStore, serialized: string): CacheStore {
    const entries = Object.entries(store).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    let pruned = { ...store };
    let json = serialized;

    while (Buffer.byteLength(json, "utf-8") > this.maxSize && entries.length > 0) {
      const [oldestKey] = entries.shift()!;
      delete pruned[oldestKey];
      json = JSON.stringify(pruned, null, 2);
    }

    return pruned;
  }

  async has(key: string): Promise<boolean> {
    return key in (await this.read());
  }

  async get(key: string): Promise<LanguageModelV3GenerateResult | undefined> {
    return (await this.read())[key]?.value;
  }

  async set(key: string, value: LanguageModelV3GenerateResult): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });

    const store = await this.read();

    store[key] = { timestamp: Date.now(), value };

    let serialized = JSON.stringify(store, null, 2);

    if (Buffer.byteLength(serialized, "utf-8") > this.maxSize) {
      const pruned = this.prune(store, serialized);
      serialized = JSON.stringify(pruned, null, 2);
    }

    await fs.writeFile(this.file, serialized);
  }
}
