/**
 * Envelope construction and error serialization for MCP tool handlers.
 *
 * Every MCP tool is wrapped by `wrapTool` — no tool constructs its own
 * envelope. This ensures consistent `{ ok, data, meta }` success responses,
 * `{ ok, condensed, text, tokens }` condensed responses, and
 * `{ ok: false, error }` error responses across all tools.
 *
 * @see F.06 RS.06
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PragmaError } from "../error/PragmaError.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import buildRecovery from "./buildRecovery.js";
import type { McpErrorPayload, ToolPayload } from "./types.js";

/**
 * Serialize a PragmaError into the `ok: false` error envelope fields.
 * Extracts code, message, suggestions, recovery, filters, and validOptions.
 */
export function serializeErrorPayload(error: PragmaError): McpErrorPayload {
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

/**
 * Estimate token count from text length using ~4 chars/token heuristic.
 */
export function estimateTokens(text: string): string {
  return `~${Math.ceil(text.length / 4)}`;
}

/**
 * Wrap a tool handler function with envelope construction and error handling.
 *
 * The returned handler catches `PragmaError` instances and serializes them
 * as `{ ok: false, error }` responses. Unknown errors propagate to the MCP
 * SDK's transport-level error handling (JSON-RPC -32603).
 *
 * @param runtime - The pragma runtime providing store, config, and cwd.
 * @param fn - The tool implementation. Receives runtime and parsed params,
 *   returns a `ToolPayload` (either `{ data, meta }` or `{ condensed, text, tokens }`).
 * @returns An MCP tool handler function.
 */
export function wrapTool(
  runtime: PragmaRuntime,
  fn: (
    rt: PragmaRuntime,
    params: Record<string, unknown>,
  ) => Promise<ToolPayload>,
): (params: Record<string, unknown>) => Promise<CallToolResult> {
  return async (params) => {
    try {
      const result = await fn(runtime, params);

      if ("condensed" in result) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: true,
                condensed: true,
                text: result.text,
                tokens: result.tokens,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              data: result.data,
              meta: result.meta ?? {},
            }),
          },
        ],
      };
    } catch (error) {
      if (error instanceof PragmaError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: false,
                error: serializeErrorPayload(error),
              }),
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  };
}
