import { describe, it, expect, vi } from "vitest";
import { getResponse } from "./ai";

vi.mock("ai", async () => {
  const { interceptors } = await import("../../src/index");

  console.log("Mocking ai module. Applying interceptors...");

  return await interceptors.ai();
});

describe("getResponse", () => {
  it("should return text from generateText", async () => {
    const result = await getResponse();

    expect(result).toBe("The capital of France is Paris.");
  });
});
