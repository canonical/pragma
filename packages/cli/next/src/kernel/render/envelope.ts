/**
 * The machine-output envelope (D3, D4).
 *
 * Both projectors emit the same two shapes: `{ ok: true, data, meta }` for a
 * success and `{ ok: false, error }` for a failure. The CLI writes them to
 * stdout under `--format json`; the MCP projector returns them as tool
 * content. Building both here — from one `successEnvelope` / `errorEnvelope`
 * pair — is what makes CLI-JSON and MCP output provably identical.
 */

import type { PragmaError } from "../error/PragmaError.js";
import { serializeError } from "../error/serialize.js";
import type { ErrorPayload } from "../error/types.js";

/** The success envelope: an agent branches on `ok` before reading `data`. */
export interface SuccessEnvelope {
  readonly ok: true;
  readonly data: unknown;
  readonly meta: Record<string, unknown>;
}

/** The failure envelope: the serialized error under `error`. */
export interface ErrorEnvelope {
  readonly ok: false;
  readonly error: ErrorPayload;
}

/**
 * Wrap already-JSON-safe data in the success envelope.
 *
 * @param data - The verb's data projection (JSON-safe).
 * @param meta - Envelope metadata (e.g. plan-first flags); defaults to `{}`.
 * @returns The `{ ok: true, data, meta }` envelope.
 */
export function successEnvelope(
  data: unknown,
  meta: Record<string, unknown> = {},
): SuccessEnvelope {
  return { ok: true, data, meta };
}

/**
 * Wrap a {@link PragmaError} in the failure envelope.
 *
 * @param error - The structured error to serialize.
 * @returns The `{ ok: false, error }` envelope.
 */
export function errorEnvelope(error: PragmaError): ErrorEnvelope {
  return { ok: false, error: serializeError(error) };
}
