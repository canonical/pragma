/**
 * MCP adapter constants.
 */

/**
 * Known CLI flag → MCP parameter mappings for recovery parsing.
 */
const FLAG_MAP: Record<string, [string, unknown]> = {
  "--all-tiers": ["allTiers", true],
  "--detailed": ["detailed", true],
};

export default FLAG_MAP;
