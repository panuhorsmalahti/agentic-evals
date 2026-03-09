import aiModule, { LanguageModel } from "ai";

type GenerateTextReturn = Awaited<ReturnType<typeof aiModule.generateText>>;

/**
 * A judge evaluates a model response (and optional input) and returns
 * a `generateText` result containing the score and reasoning.
 */
export type Judge = ({ input, output }: { input?: string; output?: string }) => Promise<GenerateTextReturn>;

/**
 * Factory for constructing a judge bound to a particular `ai` instance
 * and `LanguageModel`. Concrete judge creators in `default/` typically
 * close over a specific prompt template.
 */
export type JudgeFactory = (ai: typeof aiModule) => (model: LanguageModel) => Judge;

/**
 * Creates a `JudgeFactory` for the given prompt template.
 *
 * The template may reference `{inputs}` and `{outputs}`, which will be
 * replaced with the user input and model output respectively before
 * calling `generateText`.
 */
export const createJudge = (promptTemplate: string): JudgeFactory => (
    // TODO: Make this generic over the AI provider
  ai: typeof aiModule
) => (model: LanguageModel): Judge => async ({ input, output }): Promise<GenerateTextReturn> => {
  const prompt = promptTemplate
    .replaceAll("{inputs}", input ?? "")
    .replaceAll("{outputs}", output ?? "");

  const result = await ai.generateText({
    model,
    prompt
  });

  return result;
};
