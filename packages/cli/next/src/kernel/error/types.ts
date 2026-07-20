/**
 * Error type definitions for the pragma error system.
 *
 * Separated from the {@link PragmaError} class so consumers that only need the
 * shapes (renderers, the MCP envelope, the exit-code mapper) can import types
 * without pulling in the class or its factories.
 */

import type { ERROR_CODES } from "./constants.js";

/** Union of all recognized error code literals. */
type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Structured recovery hint attached to a {@link PragmaError}.
 *
 * `cli` — when present — is the exact command the user can run to recover; it
 * always begins with the literal `pragma ` prefix (D5), enforced by
 * {@link assertRecoveryCli}.
 */
interface Recovery {
  /** Human-readable recovery guidance. */
  message: string;
  /** CLI command the user can run to recover (starts with `pragma `). */
  cli?: string;
  /** MCP tool invocation an agent can call to recover. */
  mcp?: { tool: string; params?: Record<string, unknown> };
}

/** Raw data payload used to construct a {@link PragmaError}. */
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

/**
 * The serialized error payload embedded in the `{ ok: false, error }`
 * envelope — the exact shape the surface covenant freezes. Optional fields
 * are omitted (never `undefined`) so CLI-JSON and MCP output are byte-equal.
 */
interface ErrorPayload {
  readonly code: ErrorCode;
  readonly message: string;
  readonly suggestions?: readonly string[];
  readonly recovery?: Recovery;
  readonly validOptions?: readonly string[];
  readonly filters?: Record<string, string>;
}

export type { ErrorCode, ErrorPayload, PragmaErrorData, Recovery };
