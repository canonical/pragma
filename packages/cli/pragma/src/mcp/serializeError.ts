/**
 * PragmaError → MCP error response serialization.
 *
 * Converts structured PragmaError instances into MCP tool error
 * responses with machine-readable recovery objects (MC.03, MC.04, ER.08).
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PragmaError } from "../error/PragmaError.js";
import type { McpErrorPayload, McpRecovery } from "./types.js";

/**
 * Known CLI flag → MCP parameter mappings for recovery parsing.
 */
const FLAG_MAP: Record<string, [string, unknown]> = {
  "--all-tiers": ["allTiers", true],
  "--detailed": ["detailed", true],
};

/**
 * Parse a CLI recovery string into a structured MCP recovery object.
 *
 * Handles patterns like:
 * - `"Run \`pragma component list\` to see available components."`
 * - `"pragma component list --all-tiers"`
 */
function parseRecovery(recovery: string): McpRecovery | undefined {
  // Extract the pragma command from backtick-wrapped or plain form
  const backtickMatch = recovery.match(/`(pragma\s+[^`]+)`/);
  const command = backtickMatch?.[1] ?? recovery;

  const match = command.match(/^pragma\s+(\S+)\s+(\S+)(.*)$/);
  if (!match) return undefined;

  const [, noun, verb, flagStr] = match;
  const tool = `${noun}_${verb}`;
  const params: Record<string, unknown> = {};

  if (flagStr) {
    for (const [flag, [param, value]] of Object.entries(FLAG_MAP)) {
      if (flagStr.includes(flag)) {
        params[param] = value;
      }
    }
  }

  return {
    tool,
    params,
    description: backtickMatch
      ? recovery
          .replace(/`[^`]+`/, "")
          .replace(/^Run\s+/, "")
          .trim() || `List available ${noun}s`
      : `Run pragma ${noun} ${verb}`,
  };
}

/**
 * Build a recovery object from PragmaError.recovery.
 *
 * When recovery is an array, returns the first parseable entry.
 */
function buildRecovery(
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

/**
 * Serialize a PragmaError into an MCP tool error response.
 *
 * Returns `{ content, isError: true }` — the shape expected by
 * MCP tool handlers when reporting tool-level errors.
 */
function serializeError(error: PragmaError): CallToolResult {
  const payload: McpErrorPayload = {
    code: error.code,
    message: error.message,
    ...(error.suggestions.length > 0 && { suggestions: error.suggestions }),
    ...((result) => (result ? { recovery: result } : {}))(
      buildRecovery(error.recovery),
    ),
    ...(error.filters && { filters: error.filters }),
    ...(error.validOptions && { validOptions: error.validOptions }),
  };

  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    isError: true,
  };
}

export { serializeError };
