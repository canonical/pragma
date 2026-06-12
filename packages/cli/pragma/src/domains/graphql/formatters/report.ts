import type { Diagnostic } from "@canonical/ke-graphql";
import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { GraphqlCompileReport } from "../types.js";

/** Count diagnostics of one severity. */
function countSeverity(
  diagnostics: readonly Diagnostic[],
  severity: Diagnostic["severity"],
): number {
  return diagnostics.filter((d) => d.severity === severity).length;
}

/** Pluralize a count: `1 error`, `2 errors`. */
function plural(count: number, word: string): string {
  return `${count} ${word}${count !== 1 ? "s" : ""}`;
}

/** One-line summary of diagnostic counts and compiled sources. */
function summaryLine(report: GraphqlCompileReport): string {
  const errors = countSeverity(report.diagnostics, "error");
  const warnings = countSeverity(report.diagnostics, "warning");
  const infos = countSeverity(report.diagnostics, "info");
  return `${plural(report.files.length, "source file")}: ${plural(errors, "error")}, ${plural(warnings, "warning")}, ${infos} info`;
}

function colorSeverity(severity: Diagnostic["severity"]): string {
  if (severity === "error") return chalk.red(severity);
  if (severity === "warning") return chalk.yellow(severity);
  return chalk.dim(severity);
}

/**
 * Formatters for `pragma graphql build` and `pragma graphql check` output.
 *
 * - **plain**: one line per diagnostic (severity, code, message, source),
 *   a summary line with counts, and `Wrote <path>` lines for artifacts.
 * - **llm**: condensed Markdown under a `## GraphQL Compile` heading.
 * - **json**: serialized {@link GraphqlCompileReport} as indented JSON.
 */
const formatters: Formatters<GraphqlCompileReport> = {
  plain(report) {
    const lines = report.diagnostics.map(
      (d) =>
        `${colorSeverity(d.severity)} ${chalk.bold(d.code)}: ${d.message}${d.source ? ` (${d.source})` : ""}`,
    );
    lines.push(summaryLine(report));
    if (report.artifacts) {
      lines.push(`Wrote ${report.artifacts.sdl}`);
      lines.push(`Wrote ${report.artifacts.extraction}`);
    }
    return lines.join("\n");
  },

  llm(report) {
    const lines = ["## GraphQL Compile", ""];
    for (const d of report.diagnostics) {
      lines.push(
        `- **${d.severity}** \`${d.code}\`: ${d.message}${d.source ? ` (\`${d.source}\`)` : ""}`,
      );
    }
    if (report.diagnostics.length > 0) {
      lines.push("");
    }
    lines.push(`**Summary:** ${summaryLine(report)}`);
    if (report.artifacts) {
      lines.push(`**SDL:** \`${report.artifacts.sdl}\``);
      lines.push(`**Extraction:** \`${report.artifacts.extraction}\``);
    }
    return lines.join("\n");
  },

  json(report) {
    return JSON.stringify(report, null, 2);
  },
};

export default formatters;
