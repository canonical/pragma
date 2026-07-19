/**
 * Formatters for `pragma setup` and its sub-verbs — one shared formatter over
 * the tagged {@link SetupResult} union (plain, llm, json).
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type { SetupResult, SetupSkillsResult } from "./types.js";

/** Summarize a skills result: created / skipped / replaced counts. */
function skillsSummary(result: SetupSkillsResult): string {
  const created = result.actions.filter((a) => a.action === "created").length;
  const skipped = result.actions.filter((a) => a.action === "skipped").length;
  const replaced = result.actions.filter((a) => a.action === "replaced").length;
  return `${created} created, ${replaced} replaced, ${skipped} unchanged across ${result.harnessCount} harness(es)`;
}

/** Render a setup result to a single human line (shared by plain/llm). */
function line(data: SetupResult): string {
  switch (data.kind) {
    case "completions":
      return data.installed
        ? `Installed ${data.shell} completions at ${data.path}.`
        : "No shell detected — completions were not installed.";
    case "lsp":
      return "Terrazzo LSP extension is installed (up to date).";
    case "mcp":
      return data.configured.length > 0
        ? `Configured MCP for: ${data.configured.join(", ")}.`
        : "No harnesses configured.";
    case "skills":
      return `Skills: ${skillsSummary(data.result)}.`;
    case "all":
      return data.steps.length > 0
        ? `Setup complete — ran: ${data.steps.join(", ")}.`
        : "Setup complete — no steps selected.";
  }
}

export const setupFormatters: Formatters<SetupResult> = {
  plain(data) {
    return line(data);
  },
  llm(data) {
    return `- ${line(data)}`;
  },
  json(data) {
    return JSON.stringify(data);
  },
};
