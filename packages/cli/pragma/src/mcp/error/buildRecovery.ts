/**
 * Build an MCP recovery object from the structured Recovery type.
 *
 * Extracts `recovery.mcp` directly — no regex parsing needed.
 */

import type { Recovery } from "#error";
import type { McpRecovery } from "./types.js";

export default function buildRecovery(
  recovery: Recovery | undefined,
): McpRecovery | undefined {
  if (!recovery?.mcp) return undefined;
  return recovery.mcp;
}
