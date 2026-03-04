import aiModule, { LanguageModel } from "ai";

type GenerateTextReturn = Awaited<ReturnType<typeof aiModule.generateText>>;

export type Judge = ({ input, output }: { input?: string; output?: string }) => Promise<GenerateTextReturn>;
export type JudgeFactory = (ai: typeof aiModule) => (model: LanguageModel) => Judge;

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
