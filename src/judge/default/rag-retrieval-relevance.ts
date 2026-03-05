import { createJudge, JudgeFactory } from "../judge";
import { RAG_RETRIEVAL_RELEVANCE_PROMPT } from "openevals";

export const createRagRetrievalRelevanceJudge: JudgeFactory = createJudge(RAG_RETRIEVAL_RELEVANCE_PROMPT);
