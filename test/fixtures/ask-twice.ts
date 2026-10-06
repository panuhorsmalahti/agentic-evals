import { cacheStats } from "agentic-evals/register";
import { generateText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { mockResult } from "./mock-result.cjs";

export async function askTwice() {
  const model = new MockLanguageModelV4({ doGenerate: mockResult("Paris") });
  const first = await generateText({ model, prompt: "Capital of France?" });
  const second = await generateText({ model, prompt: "Capital of France?" });

  console.log(JSON.stringify({ texts: [first.text, second.text], calls: model.doGenerateCalls.length, stats: cacheStats() }));
}
