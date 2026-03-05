import { createJudge, JudgeFactory } from "../judge";
import { HALLUCINATION_PROMPT } from "openevals";

export const createHallucinationJudge: JudgeFactory = createJudge(HALLUCINATION_PROMPT);
