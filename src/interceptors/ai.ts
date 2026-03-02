import type { LanguageModelV3, LanguageModelV3CallOptions, LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { FileCache } from "../cache";
import { createHash } from "crypto";

const SENSITIVE_HEADERS = new Set([
  "openai-organization",
  "openai-processing-ms",
  "openai-project",
  "openai-version",
  "server",
  "set-cookie",
]);

function sanitizeResult(result: LanguageModelV3GenerateResult): LanguageModelV3GenerateResult {
  return {
    ...result,
    content: result.content.map(({ providerMetadata: _, ...item }) => item as typeof item),
    response: result.response
      ? {
          ...result.response,
          headers: result.response.headers
            ? Object.fromEntries(
                Object.entries(result.response.headers).filter(
                  ([key]) => !SENSITIVE_HEADERS.has(key.toLowerCase())
                )
              )
            : undefined,
        }
      : undefined,
  };
}

export interface WrapModelOptions {
  cacheFile?: string;
}

const expectedSpecVersion = "v3";

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

  return createHash("sha256").update(serialized).digest("hex");
}


export const ai = async (): Promise<typeof aiModule> => {
  const aiModule = await import("ai");

  function wrapModel(
    model: LanguageModelV3,
    { cacheFile }: WrapModelOptions = {}
  ): LanguageModelV3 {
    const resolvedCacheFile = cacheFile ?? `.eval-cache/${model.provider}/${model.modelId}.json`;
    const cache = new FileCache(resolvedCacheFile);

    return aiModule.wrapLanguageModel({
      model,
      middleware: {
        specificationVersion: "v3",
        wrapGenerate: async ({ doGenerate, params }) => {
          const key = hashParams(params);
          const cached = await cache.get(key);

          if (cached !== undefined) {
            console.log("Cache hit for params:", params, ". Returning cached result: ", cached);

            return cached;
          }

          const result = await doGenerate();

          console.log("Cache miss for params:", params, ". Caching result: ", result);

          await cache.set(key, sanitizeResult(result));

          return result;
        },
      },
    });
  }

  const generateText: any = async (params: Parameters<(typeof aiModule)["generateText"]>[0]) => {
    console.log("Intercepted generateText call with params:", params);

    if (typeof params.model === "string") {
      throw new Error("Only LanguageModelV3 instances are supported in this interceptor. Please create a model instance using the provider (e.g., openai) and pass it to generateText.");
    }

    if (params.model.specificationVersion !== expectedSpecVersion) {
      throw new Error(`Unsupported model specification version: ${params.model.specificationVersion}. Expected ${expectedSpecVersion}.`);
    }

    const wrappedModel = wrapModel(params.model);
    console.log("Wrapped model");

    return aiModule.generateText({
      ...params,
      model: wrappedModel,
    });
  };

  return {
    ...aiModule,
    generateText
  };
};
