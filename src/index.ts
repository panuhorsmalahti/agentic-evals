import { ai } from "./interceptors/ai";
export { createJudge } from "./judge/judge";

export const interceptors = {
  ai
}

export { judges } from "./judge/default/judges";
