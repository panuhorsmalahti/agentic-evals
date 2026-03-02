import { generateText, ModelMessage, pruneMessages } from "ai";
import { openai } from "@ai-sdk/openai";

const model = openai("gpt-5.1");

export const getResponse = async () => {
  console.log("Calling getResponse with model");
  const systemPrompt = "You are a helpful assistant for testing AI models.";
  const messages: ModelMessage[] = [
    { role: "user", content: "What is the capital of France?" },
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

  console.log("AI Response:", result.text);

  return result.text;
}
