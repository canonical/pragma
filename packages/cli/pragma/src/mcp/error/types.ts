/**
 * MCP error and recovery types.
 *
 * Defines shapes for error payloads and recovery objects used by the MCP
 * error serialization pipeline.
 */

import type { ErrorCode } from "#error";

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

/**
 * MCP recovery object — tells the AI agent what tool to try next.
 * Extracted directly from the structured `Recovery.mcp` field.
 */
export interface McpRecovery {
  readonly tool: string;
  readonly params?: Record<string, unknown>;
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
// Error envelope
// ---------------------------------------------------------------------------

/**
 * Error envelope — structured error with recovery hints.
 * Agents branch on `ok: false` to access error details.
 */
export interface ToolErrorResponse {
  readonly ok: false;
  readonly error: McpErrorPayload;
}
