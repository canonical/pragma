/**
 * Completion infrastructure — derives tab-completion from CommandDefinition[].
 *
 * Three-level resolution per PA.12 / CP.03–CP.07:
 * - Level 1: noun names (from path[0]) — instant, static
 * - Level 2: verb names (from path[1]) — instant, static
 * - Level 3: argument values (from ParameterDefinition.complete or choices) — dynamic
 *
 * @module completions
 */

export { default as buildCompleters } from "./buildCompleters.js";
export { default as resolveCompletion } from "./resolveCompletion.js";
