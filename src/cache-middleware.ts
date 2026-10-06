import { createHash } from "node:crypto";
import * as path from "node:path";
import type { LanguageModelMiddleware } from "ai";
import { FileCache } from "./cache";

type GenerateOptions = Parameters<NonNullable<LanguageModelMiddleware["wrapGenerate"]>>[0];
type CallOptions = GenerateOptions["params"];
type Model = GenerateOptions["model"];
type GenerateResult = Awaited<ReturnType<GenerateOptions["doGenerate"]>>;

/**
 * - `record`: answer from the cache, and call the model and store the response on a miss.
 * - `replay`: answer from the cache, and throw on a miss. No model is called.
 * - `off`: call the model every time, and leave the cache as it is.
 */
export type CacheMode = "record" | "replay" | "off";

const MODES: readonly CacheMode[] = ["record", "replay", "off"];

export interface CacheOptions {
  /**
   * The directory the cache is kept in, one subdirectory per provider and model.
   * Default: `AGENTIC_EVALS_CACHE_DIR`, else `.eval-cache` in the working directory.
   */
  cacheDir?: string;
  /** Default: `AGENTIC_EVALS_CACHE_MODE`, else `record`. */
  mode?: CacheMode;
  /** The largest size in bytes of one model's directory. The oldest entries are removed first. */
  maxSize?: number;
  /**
   * Rewrites the JSON that a call's key is hashed from. Use it to replace values that change from
   * run to run, such as the date, generated ids and temporary paths, so that the same call finds
   * the same entry. The model still receives the original call.
   */
  normalizeKey?: (json: string) => string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  /** The sum of the recorded durations of the calls the cache answered. */
  savedMs: number;
}

const stats: CacheStats = { hits: 0, misses: 0, savedMs: 0 };

/** The cache's hits, misses and saved time in this process so far. */
export function cacheStats(): CacheStats {
  return { ...stats };
}

/**
 * Fills the defaults from the environment and checks the mode, so that a wrong value fails when
 * the cache is set up rather than on the first model call.
 */
export function resolveCacheOptions(options: CacheOptions = {}): CacheOptions & { cacheDir: string; mode: CacheMode } {
  const mode = options.mode ?? (process.env.AGENTIC_EVALS_CACHE_MODE || "record");
  if (!MODES.includes(mode as CacheMode)) {
    throw new Error(`agentic-evals: unknown cache mode "${mode}". Use one of: ${MODES.join(", ")}.`);
  }

  return {
    ...options,
    mode: mode as CacheMode,
    cacheDir: path.resolve(options.cacheDir ?? (process.env.AGENTIC_EVALS_CACHE_DIR || ".eval-cache")),
  };
}

/**
 * Language model middleware that answers `generate` calls from a cache on disk.
 *
 * A call's key is a hash of every option that can change the response, so a changed prompt, tool
 * or setting is a miss. A streaming call passes through to the model.
 */
export function createCacheMiddleware(options: CacheOptions = {}): LanguageModelMiddleware {
  const { cacheDir, mode, maxSize, normalizeKey } = resolveCacheOptions(options);
  const caches = new Map<string, FileCache<GenerateResult>>();

  const cacheFor = (model: Model) => {
    const dir = path.join(cacheDir, pathSegment(model.provider), pathSegment(model.modelId));
    let cache = caches.get(dir);
    if (!cache) {
      cache = new FileCache<GenerateResult>(dir, { maxSize });
      caches.set(dir, cache);
    }
    return cache;
  };

  return {
    wrapGenerate: async ({ doGenerate, params, model }) => {
      if (mode === "off") return doGenerate();

      const cache = cacheFor(model);
      const key = hashCallOptions(params, normalizeKey);
      const entry = await cache.get(key);

      if (entry) {
        stats.hits += 1;
        stats.savedMs += entry.durationMs;
        return fromStored(entry.result);
      }

      stats.misses += 1;
      if (mode === "replay") {
        throw new Error(
          `agentic-evals: no cached response for ${model.provider}/${model.modelId} (key ${key}) in replay mode.`
        );
      }

      const started = performance.now();
      const result = await doGenerate();
      const durationMs = Math.round(performance.now() - started);

      const stored = toStored(result);
      await cache.set(key, { timestamp: Date.now(), durationMs, result: stored });

      // The recording run gets exactly what a replay will get, so both build the same next request.
      return fromStored(JSON.parse(JSON.stringify(stored)) as GenerateResult);
    },
  };
}

/**
 * A stable hash of the options that can change a model's response. The abort signal and the
 * request headers are left out, and object keys are sorted by code point.
 */
export function hashCallOptions(params: CallOptions, normalizeKey?: (json: string) => string): string {
  const { abortSignal: _abortSignal, headers: _headers, ...rest } = params;

  const json = JSON.stringify(rest, (_key, value: unknown) => {
    if (value instanceof Uint8Array) return Buffer.from(value).toString("base64");
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      );
    }
    return value;
  });

  return createHash("sha256")
    .update(normalizeKey ? normalizeKey(json) : json)
    .digest("hex");
}

/**
 * What a replay needs, as JSON. The request body repeats the whole prompt and the response body
 * and headers are the provider's raw reply, so none of them is kept. Content keeps its provider
 * metadata, because a provider reads it back in the next step's request.
 */
function toStored(result: GenerateResult): GenerateResult {
  const { request: _request, response, ...rest } = result;

  return {
    ...rest,
    content: result.content.map((part) =>
      part.type === "file" && part.data.type === "data" && part.data.data instanceof Uint8Array
        ? { ...part, data: { type: "data", data: Buffer.from(part.data.data).toString("base64") } }
        : part
    ),
    ...(response && {
      response: { id: response.id, timestamp: response.timestamp, modelId: response.modelId },
    }),
  };
}

/** JSON has no dates; the response timestamp is the one date in a result. */
function fromStored(stored: GenerateResult): GenerateResult {
  const timestamp = stored.response?.timestamp;
  if (timestamp === undefined) return stored;

  return { ...stored, response: { ...stored.response, timestamp: new Date(timestamp) } };
}

/** Provider and model ids become directory names, and some contain `/` or `:`. */
function pathSegment(id: string): string {
  return id.replace(/[^A-Za-z0-9._-]/g, "_");
}
