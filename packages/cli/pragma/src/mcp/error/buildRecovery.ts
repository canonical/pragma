import type { Recovery } from "#error";
import type { McpRecovery } from "./types.js";

/**
 * Build an {@link McpRecovery} object from the structured Recovery type.
 *
 * Extracts `recovery.mcp` directly — no regex parsing needed.
 *
 * @param recovery - The structured recovery attached to a PragmaError, if any.
 * @returns The MCP recovery hint, or `undefined` when no MCP path exists.
 */
export default function buildRecovery(
  recovery: Recovery | undefined,
): McpRecovery | undefined {
  if (!recovery?.mcp) return undefined;
  return recovery.mcp;
}
