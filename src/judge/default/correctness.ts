import { createJudge, JudgeFactory } from "../judge";
import { CORRECTNESS_PROMPT } from "openevals";

export const createCorrectnessJudge: JudgeFactory = createJudge(CORRECTNESS_PROMPT);
