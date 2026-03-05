import { createConcisenessJudge } from "./conciseness";
import { createHallucinationJudge } from "./hallucination";
import { createCorrectnessJudge } from "./correctness";
import { createCodeCorrectnessJudge, createCodeCorrectnessWithReferenceJudge } from "./code-correctness";
import { createRagHelpfulnessJudge } from "./rag-helpfulness";
import { createRagGroundednessJudge } from "./rag-groundedness";
import { createRagRetrievalRelevanceJudge } from "./rag-retrieval-relevance";
import { createPlanAdherenceJudge } from "./plan-adherence";
import { createAnswerRelevanceJudge } from "./answer-relevance";
import { createToxicityJudge } from "./toxicity";

export const judges = {
  createConcisenessJudge,
  createHallucinationJudge,
  createCorrectnessJudge,
  createCodeCorrectnessJudge,
  createCodeCorrectnessWithReferenceJudge,
  createRagHelpfulnessJudge,
  createRagGroundednessJudge,
  createRagRetrievalRelevanceJudge,
  createPlanAdherenceJudge,
  createAnswerRelevanceJudge,
  createToxicityJudge,
};
