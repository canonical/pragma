/**
 * Error rendering functions for different output surfaces.
 *
 * Each renderer takes a PragmaError and produces a formatted string
 * suitable for its target: human-readable plain text, LLM-oriented
 * Markdown, or machine-readable JSON.
 */

import type { PragmaError } from "../error/index.js";

/**
 * Render a PragmaError as human-readable plain text for terminal output.
 *
 * Includes suggestions, active filters, valid options, and recovery hints
 * when present.
 *
 * @param error - The structured error to render.
 * @returns Multi-line plain text string.
 */
function renderErrorPlain(error: PragmaError): string {
  const lines: string[] = [];

  lines.push(`Error: ${error.message}`);

  if (error.suggestions.length > 0) {
    lines.push("");
    lines.push("Did you mean?");
    for (const s of error.suggestions) {
      lines.push(`  - ${s}`);
    }
  }

  if (error.filters) {
    lines.push("");
    lines.push("Active filters:");
    for (const [key, value] of Object.entries(error.filters)) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  if (error.validOptions && error.validOptions.length > 0) {
    lines.push("");
    lines.push(`Valid options: ${error.validOptions.join(", ")}`);
  }

  if (error.recovery) {
    lines.push("");
    if (error.recovery.cli) {
      lines.push(`Run \`${error.recovery.cli}\``);
    } else {
      lines.push(error.recovery.message);
    }
  }

  return lines.join("\n");
}

/**
 * Render a PragmaError as condensed Markdown for LLM consumption.
 *
 * @param error - The structured error to render.
 * @returns Markdown-formatted string.
 */
function renderErrorLlm(error: PragmaError): string {
  const lines: string[] = [];

  lines.push(`## Error: ${error.code}`);
  lines.push(error.message);

  if (error.suggestions.length > 0) {
    lines.push(`Suggestions: ${error.suggestions.join(", ")}`);
  }

  if (error.filters) {
    const filterParts = Object.entries(error.filters)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    lines.push(`Filters: ${filterParts}`);
  }

  if (error.validOptions && error.validOptions.length > 0) {
    lines.push(`Valid options: ${error.validOptions.join(", ")}`);
  }

  if (error.recovery) {
    if (error.recovery.cli) {
      lines.push(`Recovery: \`${error.recovery.cli}\``);
    } else {
      lines.push(`Recovery: ${error.recovery.message}`);
    }
  }

  return lines.join("\n");
}

/**
 * Render a PragmaError as a JSON string for machine consumption.
 *
 * @param error - The structured error to render.
 * @returns JSON-serialized string of the error payload.
 */
function renderErrorJson(error: PragmaError): string {
  return JSON.stringify({
    code: error.code,
    message: error.message,
    entity: error.entity,
    suggestions: error.suggestions,
    recovery: error.recovery,
    filters: error.filters,
    validOptions: error.validOptions,
  });
}

export { renderErrorJson, renderErrorLlm, renderErrorPlain };
