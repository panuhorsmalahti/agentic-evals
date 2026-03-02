import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";

type CacheEntry = { timestamp: number; value: LanguageModelV3GenerateResult };
type CacheStore = Record<string, CacheEntry>;

export class FileCache {
  constructor(private readonly file: string) {}

  private async read(): Promise<CacheStore> {
    if (!existsSync(this.file)) return {};

    return JSON.parse(await fs.readFile(this.file, "utf-8")) as CacheStore;
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

    await fs.writeFile(this.file, JSON.stringify(store, null, 2));
  }
}
