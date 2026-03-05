import { createJudge, JudgeFactory } from "../judge";
import { TOXICITY_PROMPT } from "openevals";

export const createToxicityJudge: JudgeFactory = createJudge(TOXICITY_PROMPT);
