/**
 * Render a {@link PragmaError} for each output surface.
 *
 * Plain text targets a human terminal (stderr), condensed Markdown targets an
 * agent reading `--format llm`, and JSON emits the `{ ok: false, error }` envelope —
 * the same failure shape the MCP projector returns, so agents see one contract
 * whichever transport they use.
 */

import type { OutputFormat } from "../../constants.js";
import type { PragmaError } from "./PragmaError.js";
import { serializeError } from "./serialize.js";

/**
 * Render a {@link PragmaError} as human-readable plain text for the terminal.
 *
 * @param error - The structured error to render.
 * @returns Multi-line plain text string.
 */
function renderErrorPlain(error: PragmaError): string {
  const lines: string[] = [`Error: ${error.message}`];

  if (error.suggestions.length > 0) {
    lines.push("", "Did you mean?");
    for (const suggestion of error.suggestions) {
      lines.push(`  - ${suggestion}`);
    }
  }

  if (error.filters) {
    lines.push("", "Active filters:");
    for (const [key, value] of Object.entries(error.filters)) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  if (error.validOptions && error.validOptions.length > 0) {
    lines.push("", `Valid options: ${error.validOptions.join(", ")}`);
  }

  if (error.recovery) {
    lines.push("");
    // Keep the human guidance AND the runnable command — dropping the message
    // when a `cli` is present loses the WHY (e.g. "Build the local store …").
    lines.push(
      error.recovery.cli
        ? `${error.recovery.message} Run \`${error.recovery.cli}\``
        : error.recovery.message,
    );
  }

  return lines.join("\n");
}

/**
 * Render a {@link PragmaError} as condensed Markdown for agent consumption.
 *
 * @param error - The structured error to render.
 * @returns Markdown-formatted string.
 */
function renderErrorLlm(error: PragmaError): string {
  const lines: string[] = [`## Error: ${error.code}`, error.message];

  if (error.suggestions.length > 0) {
    lines.push(`Suggestions: ${error.suggestions.join(", ")}`);
  }

  if (error.filters) {
    const filterParts = Object.entries(error.filters)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");
    lines.push(`Filters: ${filterParts}`);
  }

  if (error.validOptions && error.validOptions.length > 0) {
    lines.push(`Valid options: ${error.validOptions.join(", ")}`);
  }

  if (error.recovery) {
    // Keep both the guidance and the runnable command (message was dropped when
    // a `cli` was present).
    lines.push(
      error.recovery.cli
        ? `Recovery: ${error.recovery.message} \`${error.recovery.cli}\``
        : `Recovery: ${error.recovery.message}`,
    );
  }

  return lines.join("\n");
}

/**
 * Render a {@link PragmaError} as the `{ ok: false, error }` JSON envelope.
 *
 * @param error - The structured error to render.
 * @returns Serialized failure envelope, identical to the MCP error envelope.
 */
function renderErrorJson(error: PragmaError): string {
  return JSON.stringify({ ok: false, error: serializeError(error) });
}

/**
 * Render an error for an EXPLICITLY requested machine format, or decline.
 *
 * The ONE machine-format envelope decision for the usage-error surfaces: an
 * explicit `--format json` renders the failure envelope, an explicit
 * `--format llm` the condensed Markdown form, and anything else returns
 * `undefined` so the caller keeps its raw default bytes. Auto-detected llm is
 * excluded by construction — `parseGlobalFlags` leaves `format` at `"plain"`
 * under auto-detection and records `autoLlm` separately — so an inferred
 * output mode can never move the default (cross-CLI parity) bytes. Hoisted so
 * the gate and the renderer pick exist ONCE instead of drifting per call
 * site (they had already split: two sites gated on json only, two on
 * json|llm, and `--format llm` enveloped one member of the usage-error class
 * while its siblings stayed raw).
 *
 * @param error - The structured error to render.
 * @param format - The parsed global `--format` value.
 * @returns The rendered string for `json`/`llm`; `undefined` for `plain`.
 */
function renderErrorForFormat(
  error: PragmaError,
  format: OutputFormat,
): string | undefined {
  if (format === "json") return renderErrorJson(error);
  if (format === "llm") return renderErrorLlm(error);
  return undefined;
}

export {
  renderErrorForFormat,
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
};
