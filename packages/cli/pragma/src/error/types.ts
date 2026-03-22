/**
 * Error type definitions for the pragma error system.
 *
 * Separates the data shapes from the PragmaError class to allow
 * lightweight imports by consumers that only need type information.
 */

import type { ERROR_CODES } from "./constants.js";

/** Union of all recognized error code literals. */
type ErrorCode = (typeof ERROR_CODES)[number];

/** Structured recovery hint attached to a PragmaError. */
interface Recovery {
  /** Human-readable recovery guidance. */
  message: string;
  /** CLI command the user can run to recover. */
  cli?: string;
  /** MCP tool invocation an LLM agent can call to recover. */
  mcp?: { tool: string; params?: Record<string, unknown> };
}

/** Raw data payload used to construct a PragmaError. */
interface PragmaErrorData {
  /** Machine-readable error classification. */
  code: ErrorCode;
  /** Human-readable error message. */
  message: string;
  /** Entity that triggered the error, if applicable. */
  entity?: { type: string; name: string };
  /** Fuzzy-matched alternative names. */
  suggestions?: string[];
  /** Recovery hint for CLI and MCP adapters. */
  recovery?: Recovery;
  /** Active filters at the time of the error. */
  filters?: Record<string, string>;
  /** Enumerated valid options when input was rejected. */
  validOptions?: string[];
}

export type { ErrorCode, PragmaErrorData, Recovery };
