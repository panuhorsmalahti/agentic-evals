import type * as Ai from "ai";
import { createCacheMiddleware, type CacheOptions } from "../cache-middleware";

type AiModule = typeof Ai;

/**
 * Returns `aiModule` with a cache in front of the model that `generateText` and `generateObject`
 * call. Every other export is the original.
 */
export function interceptAi<T extends AiModule>(aiModule: T, options: CacheOptions = {}): T {
  const middleware = createCacheMiddleware(options);

  const withCache = (model: Ai.LanguageModel) => {
    if (typeof model === "string") {
      throw new Error(
        'agentic-evals: pass a model instance created with a provider, such as openai("gpt-5.1"), not a model id.'
      );
    }
    return aiModule.wrapLanguageModel({ model, middleware });
  };

  const generateText = ((params: Parameters<AiModule["generateText"]>[0]) =>
    aiModule.generateText({ ...params, model: withCache(params.model) })) as AiModule["generateText"];

  const generateObject = ((params: Parameters<AiModule["generateObject"]>[0]) =>
    aiModule.generateObject({ ...params, model: withCache(params.model) })) as AiModule["generateObject"];

  return { ...aiModule, generateText, generateObject };
}

/**
 * Imports `ai` and returns it with the cache in front of the model, for a test runner's module
 * mock such as `vi.mock("ai", () => interceptors.ai())`.
 */
export const ai = async (options?: CacheOptions): Promise<AiModule> => interceptAi(await import("ai"), options);
