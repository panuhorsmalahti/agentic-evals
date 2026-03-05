import { createJudge, JudgeFactory } from "../judge";
import { ANSWER_RELEVANCE_PROMPT } from "openevals";

export const createAnswerRelevanceJudge: JudgeFactory = createJudge(ANSWER_RELEVANCE_PROMPT);
