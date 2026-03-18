import type { PragmaError } from "../error/index.js";

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
    if (Array.isArray(error.recovery)) {
      for (const r of error.recovery) {
        lines.push(`  - ${r}`);
      }
    } else {
      lines.push(`Run \`${error.recovery}\``);
    }
  }

  return lines.join("\n");
}

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
    if (Array.isArray(error.recovery)) {
      lines.push(
        `Recovery: ${error.recovery.map((r) => `\`${r}\``).join(", ")}`,
      );
    } else {
      lines.push(`Recovery: \`${error.recovery}\``);
    }
  }

  return lines.join("\n");
}

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
