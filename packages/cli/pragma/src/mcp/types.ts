/**
 * MCP adapter types.
 *
 * Defines shapes for MCP-specific error payloads and recovery objects.
 * Used by serializeError and registerTools.
 */

import type { ErrorCode } from "../error/constants.js";

/**
 * MCP recovery object — tells the AI agent what tool to try next.
 * Included in error responses per MC.03.
 */
export interface McpRecovery {
  readonly tool: string;
  readonly params: Record<string, unknown>;
  readonly description: string;
}

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
