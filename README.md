# agentic-evals

A library for executing evals for LLM-powered applications with built-in in-repo caching. Compatible with [vitest](https://vitest.dev) and [Jest](https://jestjs.io), and is designed to be used by coding agents.

Features:

* Supports ai from vercel
* Supports any testing library
* Supports any coding agent

Eval results are cached in the repository (with a size limit) in-order for any coding agent or CICD pipeline to access the cache without complicated remote cache setups. This allows coding agents to repeatedly call complex evals quickly.

## License

MIT
