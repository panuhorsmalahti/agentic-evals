import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// The children load the built package, so `npm test` builds first.
const run = (fixture: string, cacheDir: string) => {
  const script = path.join(__dirname, "fixtures", fixture);
  const args = fixture.endsWith(".ts") ? ["--import", "tsx", script] : [script];

  return JSON.parse(
    execFileSync(process.execPath, args, {
      env: { ...process.env, CACHE_DIR: cacheDir },
      encoding: "utf-8",
    })
  );
};

let cacheDir: string;

beforeEach(() => {
  cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-evals-register-"));
});

afterEach(() => {
  fs.rmSync(cacheDir, { recursive: true, force: true });
});

describe.each(["register-child.cjs", "register-child.mjs", "register-child.ts"])("register() in %s", (fixture) => {
  it("caches generateText for code that loads ai after it", () => {
    expect(run(fixture, cacheDir)).toEqual({
      texts: ["Paris", "Paris"],
      calls: 1,
      stats: { hits: 1, misses: 1, savedMs: expect.any(Number) },
    });
  });

  it("answers a later process from the entries an earlier one wrote", () => {
    run(fixture, cacheDir);

    expect(run(fixture, cacheDir)).toMatchObject({ calls: 0, stats: { hits: 2, misses: 0 } });
  });
});
