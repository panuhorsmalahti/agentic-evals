// A process that registers the cache, then loads `ai` with `require`.
const { register, cacheStats } = require("agentic-evals/register");

register({ cacheDir: process.env.CACHE_DIR });

const { generateText } = require("ai");
const { MockLanguageModelV4 } = require("ai/test");
const { mockResult } = require("./mock-result.cjs");

(async () => {
  const model = new MockLanguageModelV4({ doGenerate: mockResult("Paris") });
  const first = await generateText({ model, prompt: "Capital of France?" });
  const second = await generateText({ model, prompt: "Capital of France?" });

  console.log(JSON.stringify({ texts: [first.text, second.text], calls: model.doGenerateCalls.length, stats: cacheStats() }));
})();
