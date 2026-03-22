/**
 * Serialize a PragmaError into the `ok: false` error envelope fields.
 * Extracts code, message, suggestions, recovery, filters, and validOptions.
 */

import type { PragmaError } from "../error/PragmaError.js";
import buildRecovery from "./buildRecovery.js";
import type { McpErrorPayload } from "./types.js";

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
