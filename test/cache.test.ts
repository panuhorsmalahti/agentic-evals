import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as realAi from "ai";
import { jsonSchema, stepCountIs, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cacheStats, interceptAi, type CacheOptions } from "../src/index";

type GenerateResult = Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>;

const textResult = (text: string, extra: Partial<GenerateResult> = {}): GenerateResult => ({
  content: [{ type: "text", text }],
  finishReason: { unified: "stop", raw: "stop" },
  usage: {
    inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 5, text: 5, reasoning: 0 },
  },
  warnings: [],
  ...extra,
});

let cacheDir: string;

beforeEach(() => {
  cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-evals-"));
});

afterEach(() => {
  fs.rmSync(cacheDir, { recursive: true, force: true });
});

const cachedAi = (options: CacheOptions = {}) => interceptAi(realAi, { cacheDir, ...options });

const entryFiles = (model: MockLanguageModelV4) => {
  const dir = path.join(cacheDir, model.provider, model.modelId);
  return fs.existsSync(dir) ? fs.readdirSync(dir).map((name) => path.join(dir, name)) : [];
};

describe("the cache in front of generateText", () => {
  it("calls the model once and answers the same call from the cache", async () => {
    const model = new MockLanguageModelV4({ doGenerate: textResult("Paris") });
    const ai = cachedAi();

    const first = await ai.generateText({ model, prompt: "Capital of France?" });
    const second = await ai.generateText({ model, prompt: "Capital of France?" });

    expect(first.text).toBe("Paris");
    expect(second.text).toBe("Paris");
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(entryFiles(model)).toHaveLength(1);
  });

  it("calls the model again when the prompt changes", async () => {
    const model = new MockLanguageModelV4({ doGenerate: [textResult("Paris"), textResult("Berlin")] });
    const ai = cachedAi();

    await ai.generateText({ model, prompt: "Capital of France?" });
    const result = await ai.generateText({ model, prompt: "Capital of Germany?" });

    expect(result.text).toBe("Berlin");
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it("finds the entry another process wrote", async () => {
    const recording = new MockLanguageModelV4({ doGenerate: textResult("Paris") });
    await cachedAi().generateText({ model: recording, prompt: "Capital of France?" });

    const replaying = new MockLanguageModelV4({ doGenerate: textResult("unused") });
    const result = await cachedAi({ mode: "replay" }).generateText({ model: replaying, prompt: "Capital of France?" });

    expect(result.text).toBe("Paris");
    expect(replaying.doGenerateCalls).toHaveLength(0);
  });

  it("throws on a miss in replay mode without calling the model", async () => {
    const model = new MockLanguageModelV4({ doGenerate: textResult("Paris") });

    await expect(
      cachedAi({ mode: "replay" }).generateText({ model, prompt: "Capital of France?" })
    ).rejects.toThrow(/no cached response for mock-provider\/mock-model-id/);
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("calls the model every time and writes nothing in off mode", async () => {
    const model = new MockLanguageModelV4({ doGenerate: textResult("Paris") });
    const ai = cachedAi({ mode: "off" });

    await ai.generateText({ model, prompt: "Capital of France?" });
    await ai.generateText({ model, prompt: "Capital of France?" });

    expect(model.doGenerateCalls).toHaveLength(2);
    expect(entryFiles(model)).toHaveLength(0);
  });

  it("reads the mode from AGENTIC_EVALS_CACHE_MODE and rejects an unknown one", () => {
    process.env.AGENTIC_EVALS_CACHE_MODE = "replay-only";
    try {
      expect(() => cachedAi()).toThrow(/unknown cache mode "replay-only"/);
    } finally {
      delete process.env.AGENTIC_EVALS_CACHE_MODE;
    }
  });

  it("hits for calls that differ only where normalizeKey rewrites them", async () => {
    const model = new MockLanguageModelV4({ doGenerate: textResult("noted") });
    const ai = cachedAi({ normalizeKey: (json) => json.replace(/\d{4}-\d{2}-\d{2}/g, "<date>") });

    await ai.generateText({ model, system: "Today is 2026-10-05.", prompt: "Note it." });
    const result = await ai.generateText({ model, system: "Today is 2026-10-06.", prompt: "Note it." });

    expect(result.text).toBe("noted");
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(model.doGenerateCalls[0].prompt[0]).toMatchObject({ content: "Today is 2026-10-05." });
  });

  it("stores neither the request body nor the provider's raw response", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: textResult("Paris", {
        request: { body: { input: "the whole prompt" } },
        response: {
          id: "resp_1",
          timestamp: new Date("2026-10-06T12:00:00.000Z"),
          modelId: "mock-model-id",
          headers: { "anthropic-organization-id": "org-secret" },
          body: { raw: true },
        },
      }),
    });

    const result = await cachedAi().generateText({ model, prompt: "Capital of France?" });

    const [file] = entryFiles(model);
    const entry = JSON.parse(fs.readFileSync(file, "utf-8"));
    expect(entry.result.request).toBeUndefined();
    expect(entry.result.response).toEqual({ id: "resp_1", timestamp: "2026-10-06T12:00:00.000Z", modelId: "mock-model-id" });
    expect(result.response.timestamp).toEqual(new Date("2026-10-06T12:00:00.000Z"));
  });

  it("returns text that starts with a timestamp as text", async () => {
    const model = new MockLanguageModelV4({ doGenerate: textResult("2026-10-06T12:00:00Z deploy finished") });
    const ai = cachedAi();

    await ai.generateText({ model, prompt: "When did the deploy finish?" });
    const replayed = await ai.generateText({ model, prompt: "When did the deploy finish?" });

    expect(replayed.text).toBe("2026-10-06T12:00:00Z deploy finished");
  });

  it("keeps every entry when calls finish at the same time", async () => {
    const model = new MockLanguageModelV4({ doGenerate: textResult("ok") });
    const ai = cachedAi();

    await Promise.all(Array.from({ length: 20 }, (_, i) => ai.generateText({ model, prompt: `question ${i}` })));

    expect(entryFiles(model)).toHaveLength(20);
  });

  it("removes the oldest entries when the directory grows past maxSize", async () => {
    const model = new MockLanguageModelV4({ doGenerate: textResult("x".repeat(1000)) });
    const ai = cachedAi({ maxSize: 5000 });

    for (let i = 0; i < 8; i++) {
      await ai.generateText({ model, prompt: `question ${i}` });
    }

    const files = entryFiles(model);
    const size = files.reduce((total, file) => total + fs.statSync(file).size, 0);
    expect(size).toBeLessThanOrEqual(5000);
    expect(files.length).toBeGreaterThan(0);

    await ai.generateText({ model, prompt: "question 7" });
    expect(model.doGenerateCalls).toHaveLength(8);
  });

  it("replays a tool loop without calling the model", async () => {
    const toolCall = textResult("", {
      content: [{ type: "tool-call", toolCallId: "call_1", toolName: "getAddress", input: "{}" }],
      finishReason: { unified: "tool-calls", raw: "tool_use" },
    });
    const run = (model: MockLanguageModelV4, mode: CacheOptions["mode"]) =>
      cachedAi({ mode }).generateText({
        model,
        prompt: "Where do you live?",
        stopWhen: stepCountIs(3),
        tools: {
          getAddress: tool({
            inputSchema: jsonSchema<Record<string, never>>({ type: "object", properties: {} }),
            execute: async () => "221B Baker Street",
          }),
        },
      });

    const recording = new MockLanguageModelV4({ doGenerate: [toolCall, textResult("221B Baker Street")] });
    await run(recording, "record");
    const replaying = new MockLanguageModelV4();
    const result = await run(replaying, "replay");

    expect(recording.doGenerateCalls).toHaveLength(2);
    expect(replaying.doGenerateCalls).toHaveLength(0);
    expect(result.text).toBe("221B Baker Street");
  });

  it("counts hits, misses and the time the hits saved", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return textResult("Paris");
      },
    });
    const ai = cachedAi();
    const before = cacheStats();

    await ai.generateText({ model, prompt: "Capital of France?" });
    await ai.generateText({ model, prompt: "Capital of France?" });

    const after = cacheStats();
    expect(after.misses - before.misses).toBe(1);
    expect(after.hits - before.hits).toBe(1);
    expect(after.savedMs - before.savedMs).toBeGreaterThanOrEqual(45);
  });
});

describe("the cache in front of generateObject", () => {
  it("answers the same call from the cache", async () => {
    const model = new MockLanguageModelV4({ doGenerate: textResult('{"city":"Paris"}') });
    const ai = cachedAi();
    const schema = jsonSchema<{ city: string }>({
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    });

    await ai.generateObject({ model, schema, prompt: "Capital of France?" });
    const result = await ai.generateObject({ model, schema, prompt: "Capital of France?" });

    expect(result.object).toEqual({ city: "Paris" });
    expect(model.doGenerateCalls).toHaveLength(1);
  });
});
