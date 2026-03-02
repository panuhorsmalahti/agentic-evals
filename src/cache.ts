import * as fs from "node:fs";
import * as path from "node:path";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";


export class FileCache {
  constructor(private readonly dir: string) {}

  private filePath(key: string): string {
    return path.join(this.dir, `${key}.json`);
  }

  has(key: string): boolean {
    return fs.existsSync(this.filePath(key));
  }

  get(key: string): LanguageModelV3GenerateResult | undefined {
    const file = this.filePath(key);

    if (!fs.existsSync(file)) return undefined;

    const data = JSON.parse(fs.readFileSync(file, "utf-8")) as { timestamp: number; value: LanguageModelV3GenerateResult };
    return data.value;
  }

  set(key: string, value: LanguageModelV3GenerateResult): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.filePath(key), JSON.stringify({ timestamp: Date.now(), value }));
  }
}
