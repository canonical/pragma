/**
 * Build a recovery object from PragmaError.recovery.
 *
 * When recovery is an array, returns the first parseable entry.
 */

import parseRecovery from "./parseRecovery.js";
import type { McpRecovery } from "./types.js";

export default function buildRecovery(
  recovery: string | string[] | undefined,
): McpRecovery | undefined {
  if (!recovery) return undefined;

  const candidates = Array.isArray(recovery) ? recovery : [recovery];
  for (const candidate of candidates) {
    const parsed = parseRecovery(candidate);
    if (parsed) return parsed;
  }

  return undefined;
}
