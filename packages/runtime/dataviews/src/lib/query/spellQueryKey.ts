import canonicalizeSlice from "./canonicalizeSlice.js";
import stringifyStable from "./stringifyStable.js";
import type { Query } from "./types.js";

/**
 * One string identifying a query — the slice and the window together — the
 * way `spellSliceKey` identifies the slice alone. The rows a request
 * produced are the current query's exactly when the two keys agree.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function spellQueryKey({ slice, window }: Query): string {
  return stringifyStable([canonicalizeSlice(slice), window]);
}
