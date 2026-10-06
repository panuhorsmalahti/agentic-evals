// A process that registers the cache, then loads TypeScript that imports `ai`, as an entry file
// that starts a server does.
import { register } from "agentic-evals/register";

register({ cacheDir: process.env.CACHE_DIR });

import("./ask-twice").then(({ askTwice }) => askTwice());
