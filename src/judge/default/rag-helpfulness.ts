import { createJudge, JudgeFactory } from "../judge";
import { RAG_HELPFULNESS_PROMPT } from "openevals";

export const createRagHelpfulnessJudge: JudgeFactory = createJudge(RAG_HELPFULNESS_PROMPT);
