/**
 * Project a {@link PragmaError} into an SDK `McpError` for the NATIVE MCP
 * surfaces (the `prompts/*` provider, the `pragma:{+uri}` resource browser),
 * which signal failure by throwing a JSON-RPC error rather than by returning the
 * `{ ok, error }` tool envelope.
 *
 * A native read must not swallow a failure into plain-text "success" content: it
 * carries the machine `code` AND the structured `recovery` into the JSON-RPC
 * `data`, so an agent that hits a cold store over `prompts/list` or a resource
 * read sees the SAME `STORE_UNAVAILABLE` + `sources_update` recovery the tool
 * envelope carries — never a bare string with the recovery dropped.
 *
 * The SDK's `McpError`/`ErrorCode` are PASSED IN by the caller (which already
 * dynamic-imported them in its `register`), so this module — reachable on the
 * capabilities import graph — never statically pulls the SDK onto the
 * `--help`/`__complete` fast path.
 */

import type { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { PragmaError } from "../../error/PragmaError.js";

/** The SDK error primitives a provider dynamic-imports and hands to {@link mcpErrorFrom}. */
export interface McpErrorPrimitives {
  readonly McpError: typeof McpError;
  readonly ErrorCode: typeof ErrorCode;
}

/**
 * Build an `McpError` from a {@link PragmaError}, mapping the machine code to a
 * JSON-RPC code and preserving `code`/`recovery`/`suggestions`/`validOptions` in
 * `data`.
 *
 * @param error - The structured pragma error to project.
 * @param primitives - The SDK `McpError`/`ErrorCode` the caller imported.
 * @returns An `McpError` carrying the diagnostic + recovery in its `data`.
 */
export function mcpErrorFrom(
  error: PragmaError,
  { McpError: McpErrorCtor, ErrorCode: ErrorCodeEnum }: McpErrorPrimitives,
): McpError {
  // A bad/missing entity or rejected input is the caller's fault (InvalidParams);
  // an unreachable store or internal fault is the server's (InternalError).
  const jsonRpcCode =
    error.code === "ENTITY_NOT_FOUND" || error.code === "INVALID_INPUT"
      ? ErrorCodeEnum.InvalidParams
      : ErrorCodeEnum.InternalError;
  const data: Record<string, unknown> = { code: error.code };
  if (error.recovery) data.recovery = error.recovery;
  if (error.suggestions.length > 0) data.suggestions = error.suggestions;
  if (error.validOptions) data.validOptions = error.validOptions;
  return new McpErrorCtor(jsonRpcCode, error.message, data);
}
