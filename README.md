# agentic-evals

A library for executing evals for LLM-powered applications with built-in in-repo caching. Compatible with [vitest](https://vitest.dev) and [Jest](https://jestjs.io) and is designed to be used by any coding agent. The system under test is any Node.js application or module that utilizes LLMs for it's functionality.

This library is not a prompt evals library, but rather tests a complete system that uses LLMs.

Features:

* Supports `generateText` and `generateObject` from vercel's `ai` (AI SDK 7), support for other AI libraries WIP
* Supports any testing library
* Supports a system under test in its own process, such as a server started by an end-to-end suite
* Supports any coding agent

Benefits:
* No need to setup a server, credentials etc.
* LLM functionality can be tested cost-effectively and quickly in agentic flows

Work in progress:
* Support global model ids in the "ai" interceptor
* Support streaming calls (`streamText`, `streamObject`), which call the model directly
* Support other AI SDKs/libraries

Eval results are cached in the repository (with a size limit) in order for any coding agent or CICD pipeline to access the cache without complicated remote cache setups. This allows coding agents to repeatedly call complex evals quickly.

## Cache

Every response is a JSON file at `.eval-cache/<provider>/<model>/<key>.json`. The key is a hash of every call option that can change the response, so a changed prompt, tool or setting calls the model again. Commit the directory. Each response is its own file, so two branches that record new responses merge without a conflict.

Options, given to `interceptors.ai(options)`, `register(options)` or `createCacheMiddleware(options)`:

| Option | Environment variable | Default | |
|--------|----------------------|---------|-|
| `cacheDir` | `AGENTIC_EVALS_CACHE_DIR` | `.eval-cache` | Where the cache is kept. |
| `mode` | `AGENTIC_EVALS_CACHE_MODE` | `record` | `record` answers from the cache and stores each miss. `replay` answers from the cache and throws on a miss, so no model is called. `off` calls the model every time. |
| `maxSize` | | 10 MB | The largest size of one model's directory. The oldest responses are removed first. |
| `variables` | | | Patterns for values that change from run to run, such as generated ids, today's date and temporary paths, by name. Each value becomes a placeholder in the key and in the stored response, and a replay puts back the current run's value. |
| `normalizeKey` | | | A function that rewrites the JSON a key is hashed from, after `variables`. It changes the key only: a replayed response keeps the values it was recorded with. The model still receives the original call. |

`cacheStats()` returns the hits, the misses and `savedMs`, the recorded duration of the calls the cache answered.

## End-to-end tests

When the system under test runs in its own process, a module mock cannot reach it. Call `register()` in that process before anything loads `ai`, for example in the entry file the suite starts:

```typescript
import { register } from "agentic-evals/register";

register({
  variables: {
    uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    date: /\d{4}-\d{2}-\d{2}/,
  },
});

await import("./server");
```

Every later `require("ai")` and `import "ai"` in that process gets `ai` with the cache in front of the model. `register()` needs Node.js 22.15 or later.

## Example

Example production code:
```typescript
import { generateText, ModelMessage, pruneMessages, tool } from "ai";

export const getResponse = async () => {
  const result = await generateText({
    model: openai("gpt-5.1"),
    system: systemPrompt,
    messages: [
      { role: "user", content: "What is the capital of France?" },
    ];
  });

  return result.text;
}
```

"Hardcoded" trivial eval test for it:
```typescript
import { describe, it, expect, vi } from "vitest";

// vercel's "ai" package is mocked to cache LLM responses, nothing else is needed in setup
vi.mock("ai", async () => {
  const { interceptors } = await import("agentic-evals");

  return await interceptors.ai();
});

describe("ai", () => {
  describe("getResponse", () => {
    it("should return Paris from generateText", async () => {
      const result = await getResponse();

      expect(result).toMatch(/Paris/);
    });
  });
});
```

LLM-judge eval for this, using a default judge. Note that both the application's LLM request *and* the LLM-judge request are cached.
```typescript
    it("should eval result against coinciseness judge", async () => {
      const input = "What is the capital of France?";
      const output = await getResponse(input);
      const model = openai("gpt-5.1");
      const judge = await createConcisenessJudge(ai)(model)({ input, output });

      expect(judge.output).toMatchInlineSnapshot(`"9"`);
    });
```

Creating a custom LLM judge:
```typescript
export const createConcisenessJudge: JudgeFactory = createJudge(CONCISENESS_PROMPT);
```

The package includes default LLM-judges using [openevals](https://github.com/langchain-ai/openevals) prompts. List of judges:
* `createConcisenessJudge` - Evaluates whether the output is concise and to the point
* `createCorrectnessJudge` - Evaluates whether the output is factually correct
* `createHallucinationJudge` - Evaluates whether the output contains hallucinated information
* `createCodeCorrectnessJudge` - Evaluates whether generated code is correct
* `createCodeCorrectnessWithReferenceJudge` - Evaluates code correctness against a reference output
* `createAnswerRelevanceJudge` - Evaluates whether the output is relevant to the input question
* `createToxicityJudge` - Evaluates whether the output contains toxic content
* `createPlanAdherenceJudge` - Evaluates whether the output adheres to a given plan
* `createRagHelpfulnessJudge` - Evaluates whether a RAG response is helpful
* `createRagGroundednessJudge` - Evaluates whether a RAG response is grounded in the retrieved context
* `createRagRetrievalRelevanceJudge` - Evaluates whether retrieved documents are relevant to the query

## Foreword

Evals are necessary for developing LLM-based apps. How exactly should they be used, though? I propose to use layered evals for agentic engineering.

The first layer is to enable agentic engineering. It's an eval that is executed locally and must be cheap and fast, as the agent might call it frequently. Think of having just a basic eval that ensures the app's core functionality doesn't get broken. agentic-evals was created to implement this.

The second layer is to enable easy PR reviews with confidence. This is an eval against a larger dataset of different use cases (which are refined during development as new features are being added). This eval will be executed in the PR workflow and acts as a quality gate. It will be slower and more expensive.

The third layer is evaluating production data, where live data is routed to an eval system where changes to the performance of the LLM is validated against reality, not just hardcoded use cases and data sets.

This layered approach will enable a feedback loop of engineering instead of relying on gut feeling of how the LLM/agent is doing.

## License

MIT
