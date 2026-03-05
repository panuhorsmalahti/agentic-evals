import { createJudge, JudgeFactory } from "../judge";
import { CODE_CORRECTNESS_PROMPT, CODE_CORRECTNESS_PROMPT_WITH_REFERENCE_OUTPUTS } from "openevals";

export const createCodeCorrectnessJudge: JudgeFactory = createJudge(CODE_CORRECTNESS_PROMPT);
export const createCodeCorrectnessWithReferenceJudge: JudgeFactory = createJudge(CODE_CORRECTNESS_PROMPT_WITH_REFERENCE_OUTPUTS);
