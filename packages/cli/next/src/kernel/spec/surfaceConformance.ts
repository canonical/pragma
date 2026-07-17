/**
 * Frozen-covenant conformance (D1).
 *
 * `surface/surface.v2.json` is the designed, frozen surface. Each PR emits
 * only the entries it has actually built and asserts that its emitted surface
 * *conforms* to the covenant: every emitted noun+verb exists in the covenant
 * and deep-equals it, every emitted tool is one the covenant blesses, and the
 * fixed kernel sections match verbatim. The covenant may hold entries no PR
 * emits yet (the future surface) — conformance is one-directional
 * (emitted subset of covenant), so later PRs re-snapshot their slice in-diff
 * without disturbing this one.
 */

import type { EmittedSurface, EmittedVerb } from "./emitSurface.js";

/** The fixed kernel sections a covenant must match verbatim. */
const FIXED_SECTIONS = [
  "bins",
  "globalFlags",
  "detailLevels",
  "envelope",
  "exitCodes",
  "mutationContract",
  "completion",
  "configFiles",
  "budgets",
] as const;

/** The covenant document shape (the parsed golden), navigated defensively. */
export interface Covenant {
  readonly nouns: Record<string, { verbs: readonly EmittedVerb[] }>;
  readonly mcpSurface: { tools: readonly string[] };
  readonly [section: string]: unknown;
}

/** Order-sensitive structural deep-equality for JSON-shaped values. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (typeof a !== "object") return false;
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => key in bObj && deepEqual(aObj[key], bObj[key]));
}

/**
 * Assert that an emitted surface conforms to the covenant.
 *
 * @param emitted - The surface produced by {@link emitSurface}.
 * @param covenant - The parsed `surface.v2.json` golden.
 * @throws Error with a specific path on the first non-conformance.
 */
export function assertConforms(
  emitted: EmittedSurface,
  covenant: Covenant,
): void {
  for (const [noun, { verbs }] of Object.entries(emitted.nouns)) {
    const covNoun = covenant.nouns[noun];
    if (!covNoun) {
      throw new Error(`surface: emitted noun "${noun}" is not in the covenant`);
    }
    for (const verb of verbs) {
      const covVerb = covNoun.verbs.find((entry) => entry.v === verb.v);
      if (!covVerb) {
        throw new Error(
          `surface: emitted verb "${noun} ${verb.v}" is not in the covenant`,
        );
      }
      if (!deepEqual(verb, covVerb)) {
        throw new Error(
          `surface: emitted verb "${noun} ${verb.v}" does not match the covenant\n` +
            `  emitted:  ${JSON.stringify(verb)}\n` +
            `  covenant: ${JSON.stringify(covVerb)}`,
        );
      }
    }
  }

  const blessed = new Set(covenant.mcpSurface.tools);
  for (const tool of emitted.mcpSurface.tools) {
    if (!blessed.has(tool)) {
      throw new Error(`surface: emitted tool "${tool}" is not in the covenant`);
    }
  }

  for (const section of FIXED_SECTIONS) {
    if (!deepEqual(emitted[section], covenant[section])) {
      throw new Error(
        `surface: fixed section "${section}" does not match the covenant`,
      );
    }
  }
}
