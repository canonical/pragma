/**
 * Validate a tier path against the ontology.
 */

import type { Store } from "@canonical/ke";
import { PragmaError } from "#error";
import type { TierEntry } from "../../shared/types.js";
import { listTiers } from "../../tier/operations/index.js";

/**
 * Validate a tier path against the ontology.
 *
 * @returns The matching TierEntry.
 * @throws PragmaError.invalidInput if the tier path doesn't exist in the ontology.
 */
export default async function validateTier(
  store: Store,
  tierPath: string,
): Promise<TierEntry> {
  const tiers = await listTiers(store);
  const match = tiers.find((t) => t.path === tierPath);

  if (!match) {
    const validPaths = tiers.map((t) => t.path);
    throw PragmaError.invalidInput("tier", tierPath, {
      validOptions: validPaths,
      recovery: {
        message: "Reset tier configuration.",
        cli: "pragma config tier --reset",
        mcp: { tool: "config_tier", params: { reset: true } },
      },
    });
  }

  return match;
}
