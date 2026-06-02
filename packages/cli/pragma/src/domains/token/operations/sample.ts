/**
 * Returns a small number of complete token instances as exemplars.
 *
 * Composes the existing list and lookup operations to avoid duplicating
 * any SPARQL logic. Agents use this to learn the data shape before querying.
 *
 * @param store - ke store to query
 * @param count - number of samples (clamped 1–5, default 2)
 * @returns sample result with detailed tokens and total count
 * @note Queries ke store
 */

import type { Store } from "@canonical/ke";
import pickRandom from "../../shared/pickRandom.js";
import type { SampleResult, TokenDetailed } from "../../shared/types/index.js";
import listTokens from "./list.js";
import lookupToken from "./lookup.js";

export default async function sampleTokens(
  store: Store,
  count = 2,
): Promise<SampleResult<TokenDetailed>> {
  const clamped = Math.max(1, Math.min(5, count));
  const all = await listTokens(store);
  const selected = pickRandom(all, clamped);

  const samples = await Promise.all(
    selected.map((t) => lookupToken(store, t.name)),
  );

  return { samples, totalCount: all.length };
}
