import { createJudge, JudgeFactory } from "../judge";
import { CONCISENESS_PROMPT } from "openevals";

export const createConcisenessJudge: JudgeFactory = createJudge(CONCISENESS_PROMPT);
