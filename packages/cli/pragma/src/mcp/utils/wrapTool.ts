import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PragmaError } from "#error";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import serializeErrorPayload from "../error/serializeErrorPayload.js";
import type { ToolPayload } from "../types.js";

/**
 * Wrap a tool handler function with envelope construction and error handling.
 *
 * Every MCP tool is wrapped by this function — no tool constructs its own
 * envelope. This ensures consistent `{ ok, data, meta }` success responses,
 * `{ ok, condensed, text, tokens }` condensed responses, and
 * `{ ok: false, error }` error responses across all tools.
 *
 * The returned handler catches `PragmaError` instances — and generator
 * path-safety rejections tagged with `code === "UNSAFE_PATH"` — and serializes
 * them as `{ ok: false, error }` responses. Other unknown errors propagate to
 * the MCP SDK's transport-level error handling (JSON-RPC -32603).
 *
 * @param runtime - The pragma runtime providing store, config, and cwd.
 * @param fn - The tool implementation. Receives runtime and parsed params,
 *   returns a `ToolPayload` (either `{ data, meta }` or `{ condensed, text, tokens }`).
 * @returns An MCP tool handler function.
 */
export default function wrapTool(
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
      // A generator's path jail tags rejections with code "UNSAFE_PATH";
      // present them as structured invalid-input (mirroring the CLI) rather
      // than letting them surface as an opaque JSON-RPC internal error.
      const pragmaError =
        error instanceof PragmaError
          ? error
          : error instanceof Error &&
              (error as { code?: string }).code === "UNSAFE_PATH"
            ? PragmaError.unsafePath(error.message)
            : undefined;
      if (pragmaError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: false,
                error: serializeErrorPayload(pragmaError),
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
