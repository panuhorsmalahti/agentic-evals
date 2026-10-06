import { ai } from "./interceptors/ai";
export { createJudge } from "./judge/judge";

export const interceptors = {
  ai
}

export { interceptAi } from "./interceptors/ai";
export {
  cacheStats,
  createCacheMiddleware,
  type CacheMode,
  type CacheOptions,
  type CacheStats,
} from "./cache-middleware";
export { judges } from "./judge/default/judges";
