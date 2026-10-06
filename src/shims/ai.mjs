// `ai` as every importer sees it after `register()`: the original exports, with the cache in front
// of the model that `generateText` and `generateObject` call. `ai` imported from this package
// resolves to the real module.
import * as real from "ai";
// A named import: a loader that compiles this file to CommonJS, as tsx does, reads a default
// import as `exports.default`.
import { interceptRegistered } from "../register.js";

export * from "ai";

const intercepted = interceptRegistered(real);

export const generateText = intercepted.generateText;
export const generateObject = intercepted.generateObject;
