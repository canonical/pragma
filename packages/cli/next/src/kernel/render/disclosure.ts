/**
 * Progressive-disclosure resolution.
 *
 * A verb renders at one of {@link DETAIL_LEVELS}. The effective level is chosen
 * from four sources, most specific first: the `--detail` flag, the resolved
 * config's `detail`, the verb's own `disclosure.default`, and finally the
 * built-in `"standard"`. Unknown values (a stale config, a typo) fall back to
 * the default rather than erroring, so output never fails on disclosure.
 */

import {
  DEFAULT_DETAIL_LEVEL,
  DETAIL_LEVELS,
  type DetailLevel,
} from "../../constants.js";

export { DETAIL_LEVELS };

/** Type guard: is a string one of the recognized detail levels? */
function isDetailLevel(value: string): value is DetailLevel {
  return (DETAIL_LEVELS as readonly string[]).includes(value);
}

/**
 * Resolve the effective disclosure level from its ordered sources.
 *
 * @param sources - Candidate levels, applied most-specific first.
 * @param sources.flag - The explicit `--detail` value, if any.
 * @param sources.config - The resolved config's `detail`, if any.
 * @param sources.specDefault - The verb's `disclosure.default`, if any.
 * @returns The first recognized level, or `"standard"` when none matches.
 */
export function resolveDetail(sources: {
  flag?: string | undefined;
  config?: string | undefined;
  specDefault?: string | undefined;
}): DetailLevel {
  const candidate =
    sources.flag ??
    sources.config ??
    sources.specDefault ??
    DEFAULT_DETAIL_LEVEL;
  return isDetailLevel(candidate) ? candidate : DEFAULT_DETAIL_LEVEL;
}
