/**
 * Progressive-disclosure resolution.
 *
 * A verb renders at one of {@link DETAIL_LEVELS}. The effective level is chosen
 * from four sources, most specific first: the `--detail` flag, the resolved
 * config's `detail`, the verb's own `disclosure.default`, and finally the
 * built-in `"standard"`.
 *
 * The unknown-value fallback below no longer has a reachable production caller,
 * and the reason it used to — "a stale config, a typo" — is gone: PR6 made a
 * declared `detail` a `z.enum(DETAIL_LEVELS)` in `config/schema.ts`, so a bad
 * one now fails at LOAD (measured: `detail: "banana"` throws CONFIG_ERROR)
 * rather than arriving here. Every other source was already pre-validated —
 * `globalFlags.readDetail` returns `undefined` for anything outside the tuple,
 * and both `disclosure.default` and `disclosure.levels` are `z.enum` in
 * `packs/schema.ts`, which is also what the MCP `detail` param is derived from.
 * So the guard stays as what it now is: a total function's last resort, which
 * costs one `includes` and keeps `resolveDetail` callable from a test with a
 * raw string. It is not a licence for a caller to pass an unchecked level.
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
