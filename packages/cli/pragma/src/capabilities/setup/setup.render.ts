/**
 * Formatters for `pragma setup` and its sub-verbs — one shared formatter over
 * the tagged {@link SetupResult} union (plain, llm, json).
 */

import type { Formatters } from "../../kernel/spec/types.js";
import { BAND_LABELS } from "../shared/bands.js";
import type {
  ConfiguredTarget,
  SetupResult,
  SetupSkillsResult,
} from "./types.js";

/** Summarize a skills result: created / skipped / replaced counts. */
function summarizeSkills(result: SetupSkillsResult): string {
  const created = result.actions.filter((a) => a.action === "created").length;
  const skipped = result.actions.filter((a) => a.action === "skipped").length;
  const replaced = result.actions.filter((a) => a.action === "replaced").length;
  return `${created} created, ${replaced} replaced, ${skipped} unchanged across ${result.harnessCount} harness(es)`;
}

/**
 * Summarize the MCP targets grouped by band — the global (user/home) band
 * before the project (per-repo) band — so the recap shows which files at which
 * level got the pragma server. The Global/Project labels match the doctor
 * report and the CLI's `--global`/`--local` grammar (see {@link BAND_LABELS}).
 *
 * A trailing state tally is appended ONLY when something was already present
 * (an `updated` or `unchanged` target) — a clean first run (every target newly
 * `added`) keeps the plain `Configured MCP — …` line, so the idempotency detail
 * surfaces exactly when it is informative (a re-run made clear it was a no-op).
 */
function summarizeMcpTargets(targets: readonly ConfiguredTarget[]): string {
  if (targets.length === 0) return "No harnesses configured.";
  const section = (band: ConfiguredTarget["band"], label: string): string => {
    const names = targets.filter((t) => t.band === band).map((t) => t.name);
    return names.length > 0 ? `${label}: ${names.join(", ")}` : "";
  };
  const parts = [
    section("global", BAND_LABELS.global),
    section("project", BAND_LABELS.project),
  ]
    .filter((p) => p.length > 0)
    .join(" · ");
  const updated = targets.filter((t) => t.state === "drifted").length;
  const unchanged = targets.filter((t) => t.state === "configured").length;
  if (updated === 0 && unchanged === 0) {
    // Clean first run — every target newly added; keep the original recap line.
    return `Configured MCP — ${parts}.`;
  }
  const added = targets.filter((t) => t.state === "absent").length;
  return `Configured MCP — ${parts} (${added} added, ${updated} updated, ${unchanged} unchanged).`;
}

/** Render a setup result to a single human line (shared by plain/llm). */
function renderSetupLine(data: SetupResult): string {
  switch (data.kind) {
    case "completions": {
      if (!data.installed) {
        return "No shell detected — completions were not installed.";
      }
      switch (data.state) {
        case "installed":
          return `${data.shell} completions already up to date at ${data.path}.`;
        case "stale":
          return `Updated ${data.shell} completions at ${data.path}.`;
        default:
          return `Installed ${data.shell} completions at ${data.path}.`;
      }
    }
    case "lsp":
      return data.state === "installed"
        ? "Terrazzo LSP extension already installed (up to date)."
        : "Terrazzo LSP extension is installed (up to date).";
    case "mcp":
      return summarizeMcpTargets(data.targets);
    case "skills":
      return `Skills: ${summarizeSkills(data.result)}.`;
    case "all":
      return data.steps.length > 0
        ? `Setup complete — ran: ${data.steps.join(", ")}.`
        : "Setup complete — no steps selected.";
  }
}

export const setupFormatters: Formatters<SetupResult> = {
  plain(data) {
    return renderSetupLine(data);
  },
  llm(data) {
    return `- ${renderSetupLine(data)}`;
  },
  json(data) {
    return JSON.stringify(data);
  },
};
