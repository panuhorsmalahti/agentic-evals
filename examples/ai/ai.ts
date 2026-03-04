import { generateText, ModelMessage, pruneMessages, tool } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const model = openai("gpt-5.1");

export const getResponse = async (content: string) => {
  const systemPrompt = "You are a helpful assistant for testing AI models.";
  const messages: ModelMessage[] = [
    { role: "user", content },
  ];

  const result = await generateText({
    model,
    system: systemPrompt,
    messages,
    tools: undefined,
    toolChoice: 'auto',
    maxOutputTokens: 2000,
    prepareStep: ({ messages: stepMessages }) => {
      return {
        messages: pruneMessages({
          messages: stepMessages,
          toolCalls: 'before-last-3-messages',
        }),
      };
    },
  });

  return result.text;
}

export const getResponseWithTools = async () => {
  const systemPrompt = "You are a helpful assistant for testing AI models and you prefer to call tools.";
  const messages: ModelMessage[] = [
    { role: "user", content: "What is your street address?" },
  ];

  const result = await generateText({
    model,
    system: systemPrompt,
    messages,
    tools: {
      getStreetAddress: tool({
        description: "Returns the current street address of the assistant.",
        inputSchema: z.object({}),
        execute: async () => "221B Baker Street, London, NW1 6XE",
      }),
    },
    toolChoice: 'auto',
    maxOutputTokens: 1000,
  });

  return result.text;
}
