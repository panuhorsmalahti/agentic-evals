export type EvalVerdict = "pass" | "fail" | "skip";

export interface EvalCase<TInput, TOutput> {
  id: string;
  input: TInput;
  expectedOutput?: TOutput;
  metadata?: Record<string, unknown>;
}

export interface EvalResult<TInput, TOutput> {
  case: EvalCase<TInput, TOutput>;
  output: TOutput;
  verdict: EvalVerdict;
  score?: number;
  reasoning?: string;
  durationMs: number;
}

export type Evaluator<TInput, TOutput> = (
  evalCase: EvalCase<TInput, TOutput>,
  output: TOutput
) => EvalVerdict | Promise<EvalVerdict>;

export interface EvalCache<TOutput> {
  get(key: string): TOutput | undefined;
  set(key: string, value: TOutput): void;
  has(key: string): boolean;
}

export interface RunEvalOptions<TInput, TOutput> {
  cases: EvalCase<TInput, TOutput>[];
  task: (input: TInput) => TOutput | Promise<TOutput>;
  evaluators: Evaluator<TInput, TOutput>[];
  cache?: EvalCache<TOutput>;
  concurrency?: number;
}

export async function runEval<TInput, TOutput>(
  options: RunEvalOptions<TInput, TOutput>
): Promise<EvalResult<TInput, TOutput>[]> {
  const { cases, task, evaluators, cache } = options;
  const results: EvalResult<TInput, TOutput>[] = [];

  for (const evalCase of cases) {
    const cacheKey = evalCase.id;
    const start = Date.now();

    let output: TOutput;
    if (cache?.has(cacheKey)) {
      output = cache.get(cacheKey) as TOutput;
    } else {
      output = await task(evalCase.input);
      cache?.set(cacheKey, output);
    }

    const durationMs = Date.now() - start;

    let verdict: EvalVerdict = "pass";
    for (const evaluator of evaluators) {
      const v = await evaluator(evalCase, output);
      if (v === "fail") {
        verdict = "fail";
        break;
      }
      if (v === "skip") {
        verdict = "skip";
        break;
      }
    }

    results.push({ case: evalCase, output, verdict, durationMs });
  }

  return results;
}
