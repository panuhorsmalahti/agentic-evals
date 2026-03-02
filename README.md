# agentic-evals

A library for executing evals for LLM-powered applications with built-in in-repo caching. Compatible with [vitest](https://vitest.dev) and [Jest](https://jestjs.io), and is designed to be used by coding agents.

Features:

* Supports any AI provider or model
* Supports any coding agent
* Supports any testing library

Eval results are cached in the repository (with a size limit) in-order for any coding agent or CICD pipeline to access the cache without complicated remote cache setups.

## License

MIT
