/**
 * Plain `(noun, verb)` uniqueness across compiled verbs.
 *
 * Replaces the old reserved-verb / derive-reserved machinery: every verb the
 * projectors see — authored, bundled-pack, or dynamic-pack — must own a distinct
 * `(noun, verb)` key. Precedence (config > package > bundled) is resolved by
 * NOUN before this runs, so a surviving collision here is a real conflict (a
 * dynamic pack claiming an authored noun's verb), reported with both sources.
 */

import type { VerbSpec } from "../spec/types.js";

/** The `(noun, verb)` key for a verb path (`["standard","list"]` → `standard list`). */
export function verbKey(path: readonly [string, string?]): string {
  return path[1] ? `${path[0]} ${path[1]}` : path[0];
}

/**
 * Assert that no two verbs share a `(noun, verb)` key.
 *
 * @param verbs - Every verb the projectors will see.
 * @throws Error naming the colliding key on the first duplicate.
 */
export function assertUniqueVerbs(verbs: readonly VerbSpec[]): void {
  const seen = new Set<string>();
  for (const verb of verbs) {
    const key = verbKey(verb.path);
    if (seen.has(key)) {
      throw new Error(
        `duplicate command "${key}" — two capabilities claim it.`,
      );
    }
    seen.add(key);
  }
}
