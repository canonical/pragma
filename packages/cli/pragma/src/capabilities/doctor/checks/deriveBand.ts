/**
 * Derive a doctor check's config band from the harnesses it actually found,
 * rather than a static per-check-name guess. The aggregate MCP checks read each
 * harness's DEFAULT-band file (`defaultBandOf` — the home config for a
 * global-only harness like Windsurf, the project file otherwise), so the band a
 * finding belongs to is exactly that default band.
 */

import type { DetectedHarness } from "@canonical/harnesses";
import { defaultBandOf } from "@canonical/harnesses";
import type { ScopeBand } from "../types.js";

/**
 * The single config band a set of detected harnesses shares, or `undefined` when
 * the set is empty or genuinely spans BOTH bands. A two-band finding stays
 * unbanded (rendered in the general section) instead of being mislabeled as one
 * band — faithful to the two-band model: band by what was found, never a guess.
 *
 * @param harnesses - The detected harnesses the check reports on.
 * @returns The shared {@link ScopeBand}, or `undefined` when none/mixed.
 */
export function deriveBand(
  harnesses: readonly DetectedHarness[],
): ScopeBand | undefined {
  const bands = new Set<ScopeBand>();
  for (const detected of harnesses) bands.add(defaultBandOf(detected.harness));
  return bands.size === 1 ? bands.values().next().value : undefined;
}
