import type { Store } from "@canonical/ke";
import { PragmaError } from "#error";
import type { TierEntry } from "../../shared/types/index.js";
import { listTiers } from "../../tier/operations/index.js";

/**
 * Validate a tier path against the ke store ontology.
 *
 * @param store - The booted ke store.
 * @param tierPath - The tier path string to validate.
 * @returns The matching TierEntry.
 * @throws PragmaError.invalidInput if the tier path does not exist in the ontology.
 * @note Queries ke store
 */
/** Normalise a tier path for comparison: trim and lowercase. */
function normalizeTierPath(path: string): string {
  return path.trim().toLowerCase();
}

export default async function validateTier(
  store: Store,
  tierPath: string,
): Promise<TierEntry> {
  const tiers = await listTiers(store);
  // Compare case/format-insensitively so the documented lowercase slash-path
  // (`apps/lxd`) matches the ontology's title-case label (`Apps/LXD`).
  const target = normalizeTierPath(tierPath);
  const match = tiers.find((t) => normalizeTierPath(t.path) === target);

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
