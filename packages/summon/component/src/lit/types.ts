/**
 * Types for Lit web component generator
 */

import type { BaseComponentAnswers } from "../shared/index.js";

/**
 * Lit web component generator answers — the base answers minus SSR tests,
 * which the lit generator does not offer (its prompts never collect the flag,
 * so the type must not promise it).
 */
export type LitAnswers = Omit<BaseComponentAnswers, "withSsrTests">;
