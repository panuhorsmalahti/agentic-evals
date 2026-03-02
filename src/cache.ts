import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { LanguageModelV3CallOptions, LanguageModelV3GenerateResult } from "@ai-sdk/provider";

export function hashParams(params: LanguageModelV3CallOptions): string {
  // Exclude fields that don't affect model output
  const { abortSignal: _a, headers: _h, ...rest } = params;

  const serialized = JSON.stringify(rest, (_key, value: unknown) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b)
        )
      );
    }
    return value;
  });

  console.log("Hashing params:", serialized);

  return crypto.createHash("sha256").update(serialized).digest("hex");
}

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

    return JSON.parse(fs.readFileSync(file, "utf-8")) as LanguageModelV3GenerateResult;
  }

  set(key: string, value: LanguageModelV3GenerateResult): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.filePath(key), JSON.stringify(value, null, 2));
  }
}
