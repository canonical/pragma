import type { MODIFIER_FAMILIES } from "./constants.js";

type ModifierFamilyKey = keyof typeof MODIFIER_FAMILIES;
export type ModifierFamilyValues = {
  [K in ModifierFamilyKey]?: (typeof MODIFIER_FAMILIES)[K][number] | undefined;
};

/**
 * A helper type that extracts the union type of a modifier family
 *
 * @example
 * ```ts
 * type Severity = ModifierFamily<'severity'>;
 * // =>
 * type Severity = {
 *  severity: 'neutral' | 'positive' | 'negative' | 'caution' | 'information'
 * }
 *
 * type Modifiers = ModifierFamily<['severity', 'emphasis']>;
 * // =>
 * type Modifiers = {
 *  severity: 'neutral' | 'positive' | 'negative' | 'caution' | 'information'
 *  emphasis: 'neutral' | 'highlighted' | 'muted' | 'accented'
 * }
 * ```
 */
export type ModifierFamily<T extends ModifierFamilyKey | ModifierFamilyKey[]> =
  Pick<ModifierFamilyValues, T extends ModifierFamilyKey[] ? T[number] : T>;
