/**
 * Returns a small number of complete modifier family instances as exemplars.
 *
 * Composes the existing list and lookup operations to avoid duplicating
 * any SPARQL logic. Agents use this to learn the data shape before querying.
 *
 * @param store - ke store to query
 * @param count - number of samples (clamped 1–5, default 2)
 * @returns sample result with detailed modifier families and total count
 * @note Queries ke store
 */

import type { Store } from "@canonical/ke";
import pickRandom from "../../shared/pickRandom.js";
import type { ModifierFamily, SampleResult } from "../../shared/types/index.js";
import listModifiers from "./list.js";
import lookupModifier from "./lookup.js";

export default async function sampleModifiers(
  store: Store,
  count = 2,
): Promise<SampleResult<ModifierFamily>> {
  const clamped = Math.max(1, Math.min(5, count));
  const all = await listModifiers(store);
  const selected = pickRandom(all, clamped);

  const samples = await Promise.all(
    selected.map((m) => lookupModifier(store, m.name)),
  );

  return { samples, totalCount: all.length };
}
