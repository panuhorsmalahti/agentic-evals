import { createJudge, JudgeFactory } from "../judge";
import { PLAN_ADHERENCE_PROMPT } from "openevals";

export const createPlanAdherenceJudge: JudgeFactory = createJudge(PLAN_ADHERENCE_PROMPT);
