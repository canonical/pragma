/**
 * Bundled transitional prompts (D6 v1 catalog).
 *
 * The transitional mirror of `pack/bundled/*Pack.ts` for the prompts
 * surface: these are DATA files shipped inside pragma until the v2 pack
 * loader lands, at which point packages ship `kind: "prompt"` documents
 * of the SAME shape and this array becomes the lowest-precedence source.
 * One prompt per file so the catalog reshuffles without code changes.
 */

import { auditCodePrompt } from "./auditCodePrompt.js";
import { exploreGraphPrompt } from "./exploreGraphPrompt.js";
import { fixEmptyResultsPrompt } from "./fixEmptyResultsPrompt.js";
import { implementComponentPrompt } from "./implementComponentPrompt.js";

/** Every prompt pragma ships by default, in listing order. */
export const BUNDLED_PROMPTS: readonly unknown[] = [
  implementComponentPrompt,
  auditCodePrompt,
  exploreGraphPrompt,
  fixEmptyResultsPrompt,
];
