import { wrapLanguageModel } from "ai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { FileCache, hashParams } from "../cache";

export interface WrapModelOptions {
  cacheDir?: string;
}

function wrapModel(
  model: LanguageModelV3,
  { cacheDir = ".eval-cache" }: WrapModelOptions = {}
): LanguageModelV3 {
  const cache = new FileCache(cacheDir);

  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v3",
      wrapGenerate: async ({ doGenerate, params }) => {
        const key = hashParams(params);
        const cached = cache.get(key);

        if (cached !== undefined) {
          console.log("Cache hit for params:", params, ". Returning cached result: ", cached);

          return cached;
        }

        const result = await doGenerate();

        console.log("Cache miss for params:", params, ". Caching result: ", result);

        cache.set(key, result);

        return result;
      },
    },
  });
}

const expectedSpecVersion = "v3";

export const ai = async (): Promise<typeof aiModule> => {
  const aiModule = await import("ai");

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
