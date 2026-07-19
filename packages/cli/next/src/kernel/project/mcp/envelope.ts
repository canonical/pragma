/**
 * MCP transport wrapping of the shared machine envelope.
 *
 * The MCP projector returns the *same* `{ ok, data, meta }` / `{ ok, error }`
 * envelope the CLI emits under `--format json` — built by the shared
 * `successEnvelope` / `errorEnvelope` — serialized into a single text content
 * block (D4). Reusing the shared builders is what guarantees CLI-JSON and MCP
 * output are byte-identical.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PragmaError } from "../../error/PragmaError.js";
import { errorEnvelope, successEnvelope } from "../../render/envelope.js";

/**
 * Wrap success data as an MCP tool result.
 *
 * @param data - The JSON-safe data projection.
 * @param meta - Envelope metadata (e.g. plan-first flags); defaults to `{}`.
 * @returns The tool result carrying the success envelope.
 */
export function toolSuccess(
  data: unknown,
  meta: Record<string, unknown> = {},
): CallToolResult {
  return {
    content: [
      { type: "text", text: JSON.stringify(successEnvelope(data, meta)) },
    ],
  };
}

/**
 * Wrap a {@link PragmaError} as an MCP tool result flagged `isError`.
 *
 * @param error - The structured error to serialize.
 * @returns The tool result carrying the failure envelope.
 */
export function toolError(error: PragmaError): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(errorEnvelope(error)) }],
    isError: true,
  };
}
