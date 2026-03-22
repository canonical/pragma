/**
 * MCP tool envelope types.
 *
 * Defines shapes for MCP response envelopes returned by `wrapTool`.
 * Error-related types live in `./error/types.js`.
 */

export type {
  McpErrorPayload,
  McpRecovery,
  ToolErrorResponse,
} from "./error/types.js";

// ---------------------------------------------------------------------------
// Tool handler payload (returned by tool implementation functions)
// ---------------------------------------------------------------------------

/**
 * Union type returned by tool handler functions to `wrapTool`.
 * Either structured data with optional metadata, or condensed text output.
 */
export type ToolPayload =
  | {
      readonly data: unknown;
      readonly meta?: {
        readonly count?: number;
        readonly filters?: Record<string, string>;
      };
    }
  | {
      readonly condensed: true;
      readonly text: string;
      readonly tokens: string;
    };

// ---------------------------------------------------------------------------
// Response envelopes (serialized into MCP content)
// ---------------------------------------------------------------------------

/**
 * Success envelope — full structured data response.
 * Agents branch on `ok: true` to access `data` and `meta`.
 */
export interface ToolResponse<T = unknown> {
  readonly ok: true;
  readonly data: T;
  readonly meta: {
    readonly count?: number;
    readonly filters?: Record<string, string>;
  };
}

/**
 * Success envelope — condensed text response for token-budgeted agents.
 * Agents branch on `condensed: true` to access markdown text.
 */
export interface ToolResponseCondensed {
  readonly ok: true;
  readonly condensed: true;
  readonly text: string;
  readonly tokens: string;
}
