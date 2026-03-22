/**
 * Serialize a PragmaError into an MCP tool error response.
 *
 * Returns `{ content, isError: true }` — the shape expected by
 * MCP tool handlers when reporting tool-level errors (MC.03, MC.04, ER.08).
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PragmaError } from "#error";
import buildRecovery from "./buildRecovery.js";
import type { McpErrorPayload } from "./types.js";

export default function serializeError(error: PragmaError): CallToolResult {
  const recovery = buildRecovery(error.recovery);

  const payload: McpErrorPayload = {
    code: error.code,
    message: error.message,
    ...(error.suggestions.length > 0 && { suggestions: error.suggestions }),
    ...(recovery && { recovery }),
    ...(error.filters && { filters: error.filters }),
    ...(error.validOptions && { validOptions: error.validOptions }),
  };

  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    isError: true,
  };
}
