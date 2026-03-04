import { describe, it, expect, vi } from "vitest";
import { getResponse, getResponseWithTools } from "./ai";
import ai from "ai";
import { createConcisenessJudge } from "../../src/judge/default/conciseness";
import { openai } from "@ai-sdk/openai";

vi.mock("ai", async () => {
  const { interceptors } = await import("../../src/index");

  const mod = await interceptors.ai();
  return { ...mod, default: mod };
});

describe("ai", () => {
  describe("getResponse", () => {
    it("should return text from generateText", async () => {
      const result = await getResponse("What is the capital of France?");

      expect(result).toBe("The capital of France is Paris.");
    });

    it("should eval result against coinciseness judge", async () => {
      const input = "What is the capital of France?";
      const output = await getResponse(input);
      const model = openai("gpt-5.1");
      const judge = await createConcisenessJudge(ai)(model)({ input, output });

      expect(judge.output).toMatchInlineSnapshot(`"9"`);
    });
  });

  describe("getResponseWithTools", () => {
    it("should return text from generateText with tools", async () => {
      const result = await getResponseWithTools();

      expect(result).toBeTypeOf("string");
    });
  });
});
