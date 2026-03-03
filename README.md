# agentic-evals

A library for executing evals for LLM-powered applications with built-in in-repo caching. Compatible with [vitest](https://vitest.dev) and [Jest](https://jestjs.io) and is designed to be used by any coding agent. The system under test is any Node.js application or module that utilizes LLMs for it's functionality.

Features:

* Supports ai from vercel, support for other AI libraries WIP
* Supports any testing library
* Supports any coding agent

Benefits:
* No need to setup a server, credentials etc.
* LLM functionality can be tested cost-effectively and quickly in agentic flows

Work in progress:
* Support global model ids in the "ai" interceptor
* Support other AI SDKs/libraries

Eval results are cached in the repository (with a size limit) in order for any coding agent or CICD pipeline to access the cache without complicated remote cache setups. This allows coding agents to repeatedly call complex evals quickly.

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
  const { interceptors } = await import("../../src/index");

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

LLM-judge eval for this:
```typescript
// TODO
```

## Foreword

Evals are necessary for developing LLM-based apps. How exactly should they be used, though? I propose to use layered evals for agentic engineering.

The first layer is to enable agentic engineering. It's an eval that is executed locally and must be cheap and fast, as the agent might call it frequently. Think of having just a basic eval that ensures the app's core functionality doesn't get broken. agentic-evals was created to implement this.

The second layer is to enable easy PR reviews with confidence. This is an eval against a larger dataset of different use cases (which are refined during development as new features are being added). This eval will be executed in the PR workflow and acts as a quality gate. It will be slower and more expensive.

The third layer is evaluating production data, where live data is routed to an eval system where changes to the performance of the LLM is validated against reality, not just hardcoded use cases and data sets.

This layered approach will enable a feedback loop of engineering instead of relying on gut feeling of how the LLM/agent is doing.

## License

MIT
