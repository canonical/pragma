/**
 * Types for Svelte component generator
 */

import type { BaseComponentAnswers } from "../shared/index.js";

/** Svelte component generator answers */
export interface SvelteComponentAnswers extends BaseComponentAnswers {
  /** Use TypeScript stories format instead of Svelte CSF */
  useTsStories: boolean;
}
