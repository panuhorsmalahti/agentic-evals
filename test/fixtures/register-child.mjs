// A process that registers the cache, then loads `ai` with `import`.
import { register, cacheStats } from "agentic-evals/register";
import { MockLanguageModelV4 } from "ai/test";
import { mockResult } from "./mock-result.cjs";

register({ cacheDir: process.env.CACHE_DIR });

const { generateText } = await import("ai");

const model = new MockLanguageModelV4({ doGenerate: mockResult("Paris") });
const first = await generateText({ model, prompt: "Capital of France?" });
const second = await generateText({ model, prompt: "Capital of France?" });

console.log(JSON.stringify({ texts: [first.text, second.text], calls: model.doGenerateCalls.length, stats: cacheStats() }));
