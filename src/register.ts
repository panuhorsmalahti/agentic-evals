import * as nodeModule from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import type * as Ai from "ai";
import { resolveCacheOptions, type CacheOptions } from "./cache-middleware";
import { interceptAi } from "./interceptors/ai";

export { cacheStats, type CacheMode, type CacheOptions, type CacheStats } from "./cache-middleware";

const SHIM_URL = pathToFileURL(path.join(__dirname, "shims", "ai.mjs")).href;
const PACKAGE_URL = pathToFileURL(__dirname + path.sep).href;

let registered: CacheOptions | undefined;

/**
 * Puts the cache in front of every `generateText` and `generateObject` call in this process. Use
 * it where the system under test runs outside the test runner, such as a server that an
 * end-to-end suite starts.
 *
 * Every later `require("ai")` and `import "ai"` gets `ai` with the cache in front of the model. A
 * module that loaded `ai` before this call keeps the original, so call it first. Needs Node.js
 * 22.15 or later.
 */
export function register(options: CacheOptions = {}): void {
  if (registered) throw new Error("agentic-evals: register() has already run in this process.");
  if (!nodeModule.registerHooks) throw new Error("agentic-evals: register() needs Node.js 22.15 or later.");

  registered = resolveCacheOptions(options);
  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      // The shim imports the real `ai` from inside this package.
      if (specifier !== "ai" || context.parentURL?.startsWith(PACKAGE_URL)) {
        return nextResolve(specifier, context);
      }
      return { url: SHIM_URL, format: "module", shortCircuit: true };
    },
  });
}

/** The real `ai` with the options `register()` was given. Called by the shim. */
export function interceptRegistered<T extends typeof Ai>(aiModule: T): T {
  return interceptAi(aiModule, registered);
}
