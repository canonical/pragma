/**
 * Returns a small number of complete standard instances as exemplars.
 *
 * Composes the existing list and lookup operations to avoid duplicating
 * any SPARQL logic. Agents use this to learn the data shape before querying.
 *
 * @param store - ke store to query
 * @param count - number of samples (clamped 1–5, default 2)
 * @returns sample result with detailed standards and total count
 * @note Queries ke store
 */

import type { Store } from "@canonical/ke";
import pickRandom from "../../shared/pickRandom.js";
import type {
  SampleResult,
  StandardDetailed,
} from "../../shared/types/index.js";
import listStandards from "./list.js";
import lookupStandard from "./lookup.js";

export default async function sampleStandards(
  store: Store,
  count = 2,
): Promise<SampleResult<StandardDetailed>> {
  const clamped = Math.max(1, Math.min(5, count));
  const all = await listStandards(store);
  const selected = pickRandom(all, clamped);

  const samples = await Promise.all(
    selected.map((s) => lookupStandard(store, s.name)),
  );

  return { samples, totalCount: all.length };
}
