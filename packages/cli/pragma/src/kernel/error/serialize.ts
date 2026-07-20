/**
 * Serialize a {@link PragmaError} into the covenant's error payload.
 *
 * The payload is the `error` field of the `{ ok: false, error }` envelope and
 * is shared verbatim by the CLI (`--format json`) and MCP projectors, so both
 * emit byte-identical error output. Optional fields are omitted rather than set
 * to `undefined`, keeping the JSON minimal and stable.
 */

import type { PragmaError } from "./PragmaError.js";
import type { ErrorPayload } from "./types.js";

/**
 * Project a {@link PragmaError} onto the frozen {@link ErrorPayload} shape.
 *
 * @param error - The structured error to serialize.
 * @returns The payload embedded under `error` in the failure envelope.
 */
export function serializeError(error: PragmaError): ErrorPayload {
  return {
    code: error.code,
    message: error.message,
    ...(error.suggestions.length > 0 && { suggestions: error.suggestions }),
    ...(error.recovery && { recovery: error.recovery }),
    ...(error.validOptions && { validOptions: error.validOptions }),
    ...(error.filters && { filters: error.filters }),
  };
}
