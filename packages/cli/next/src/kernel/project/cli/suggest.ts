/**
 * Turn an unknown command into an actionable "Did you mean?".
 *
 * When Commander rejects an unrecognized noun or verb, the bin resolves the
 * offending token and the set of siblings it should have matched, then raises a
 * `PragmaError.unknownVerb` (its suggestions ranked by `suggestNames`) rendered
 * through the shared error renderers — so the plain path gets the same `Error:`
 * prefix and "Did you mean?" list as every other error. The resolution is
 * data-driven — a noun→verbs map built from the grammar — so no Commander
 * internals leak into the suggester.
 */

import type { VerbSpec } from "../../spec/types.js";

/** An unresolved token and the sibling names to rank it against. */
export interface UnknownCommand {
  readonly token: string;
  readonly candidates: readonly string[];
}

/**
 * Build the noun → verb-labels map from the registered verbs.
 *
 * Hidden verbs are excluded. A self-verb (path length 1, e.g. `["info"]`)
 * contributes an entry with no sub-verbs.
 *
 * @param verbs - All registered verbs.
 * @returns A map from noun to its verb labels (empty for self-verbs).
 */
export function nounVerbMap(verbs: readonly VerbSpec[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const verb of verbs) {
    if (verb.hidden) continue;
    const [noun, sub] = verb.path;
    const labels = map.get(noun) ?? [];
    if (sub) labels.push(sub);
    map.set(noun, labels);
  }
  return map;
}

/**
 * Locate the first token that does not resolve against the known commands.
 *
 * @param positionals - The stripped positional args (no flags), in order.
 * @param nouns - The noun → verb-labels map from {@link nounVerbMap}.
 * @returns The unresolved token with its candidates, or `undefined` when the
 *   args resolve cleanly.
 */
export function resolveUnknownCommand(
  positionals: readonly string[],
  nouns: ReadonlyMap<string, readonly string[]>,
): UnknownCommand | undefined {
  const [noun, verb] = positionals;
  if (noun === undefined) return undefined;

  if (!nouns.has(noun)) {
    return { token: noun, candidates: [...nouns.keys()] };
  }

  const labels = nouns.get(noun) ?? [];
  if (verb !== undefined && labels.length > 0 && !labels.includes(verb)) {
    return { token: verb, candidates: labels };
  }

  return undefined;
}
