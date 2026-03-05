import { createJudge, JudgeFactory } from "../judge";
import { RAG_GROUNDEDNESS_PROMPT } from "openevals";

export const createRagGroundednessJudge: JudgeFactory = createJudge(RAG_GROUNDEDNESS_PROMPT);
