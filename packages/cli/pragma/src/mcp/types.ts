/**
 * MCP adapter types.
 *
 * Defines shapes for MCP response envelopes, error payloads, and recovery
 * objects. All MCP tools return one of these envelope shapes via `wrapTool`.
 */

import type { ErrorCode } from "../error/types.js";

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

/**
 * MCP recovery object — tells the AI agent what tool to try next.
 * Included in error responses per MC.03.
 */
export interface McpRecovery {
  readonly tool: string;
  readonly params: Record<string, unknown>;
  readonly description: string;
}

// ---------------------------------------------------------------------------
// Error payload
// ---------------------------------------------------------------------------

/**
 * Structured MCP error payload embedded in tool response content.
 * Returned as JSON text content with `isError: true`.
 */
export interface McpErrorPayload {
  readonly code: ErrorCode;
  readonly message: string;
  readonly suggestions?: readonly string[];
  readonly recovery?: McpRecovery;
  readonly filters?: Record<string, string>;
  readonly validOptions?: readonly string[];
}

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

/**
 * Error envelope — structured error with recovery hints.
 * Agents branch on `ok: false` to access error details.
 */
export interface ToolErrorResponse {
  readonly ok: false;
  readonly error: McpErrorPayload;
}
