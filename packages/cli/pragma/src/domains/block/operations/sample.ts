/**
 * Returns a small number of complete block instances as exemplars.
 *
 * Composes the existing list and lookup operations to avoid duplicating
 * any SPARQL logic. Agents use this to learn the data shape before querying.
 *
 * @param store - ke store to query
 * @param filters - tier and channel filter configuration
 * @param count - number of samples (clamped 1–5, default 2)
 * @returns sample result with detailed blocks and total count
 * @note Queries ke store
 */

import type { Store } from "@canonical/ke";
import pickRandom from "../../shared/pickRandom.js";
import type {
  BlockDetailed,
  FilterConfig,
  SampleResult,
} from "../../shared/types/index.js";
import listBlocks from "./list.js";
import lookupBlock from "./lookup.js";

export default async function sampleBlocks(
  store: Store,
  filters: FilterConfig,
  count = 2,
): Promise<SampleResult<BlockDetailed>> {
  const clamped = Math.max(1, Math.min(5, count));
  const all = await listBlocks(store, filters);
  const selected = pickRandom(all, clamped);

  const samples = await Promise.all(
    selected.map(async (b) => {
      const results = await lookupBlock(store, b.name, filters);
      return results[0] as BlockDetailed;
    }),
  );

  return { samples, totalCount: all.length };
}
