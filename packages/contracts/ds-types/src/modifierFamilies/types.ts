import type { MODIFIER_FAMILIES } from "./constants.js";

/**
 * A helper type that extracts the union type of a modifier family
 * e.g. `ModifierFamily<'severity'>` will resolve to `'neutral' | 'positive' | 'negative' | 'caution' | 'information'`
 */
export type ModifierFamily<T extends keyof typeof MODIFIER_FAMILIES> =
  (typeof MODIFIER_FAMILIES)[T][number];
