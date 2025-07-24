import { BUNDLED_RULESETS_DIR } from "../constants.js";
import type { RulesetLocation } from "../types.js";
import discoverRulesetsInDir from "./discoverRulesetsInDir.js";

/**
 * Discovers all available rulesets (bundled and local)
 */
export default async function discoverAllRulesets(): Promise<{
  bundled: RulesetLocation[];
  local: RulesetLocation[];
}> {
  const [bundled, local] = await Promise.all([
    discoverRulesetsInDir(BUNDLED_RULESETS_DIR, "bundled"),
    discoverRulesetsInDir(process.cwd(), "local"),
  ]);

  return { bundled, local };
}
