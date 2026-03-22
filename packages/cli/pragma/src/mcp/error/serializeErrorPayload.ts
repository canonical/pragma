import type { PragmaError } from "#error";
import buildRecovery from "./buildRecovery.js";
import type { McpErrorPayload } from "./types.js";

/**
 * Serialize a PragmaError into the `ok: false` error envelope fields.
 *
 * Extracts code, message, suggestions, recovery, filters, and validOptions
 * into an {@link McpErrorPayload} for embedding in the tool response envelope.
 *
 * @param error - The PragmaError to serialize.
 * @returns A structured error payload for the MCP response envelope.
 */
export default function serializeErrorPayload(
  error: PragmaError,
): McpErrorPayload {
  const recovery = buildRecovery(error.recovery);

  return {
    code: error.code,
    message: error.message,
    ...(error.suggestions.length > 0 && { suggestions: error.suggestions }),
    ...(recovery && { recovery }),
    ...(error.filters && { filters: error.filters }),
    ...(error.validOptions && { validOptions: error.validOptions }),
  };
}
