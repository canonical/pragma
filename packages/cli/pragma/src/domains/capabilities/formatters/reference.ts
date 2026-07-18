import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { ReferencePayload } from "../types.js";

/** Access mode column derived from the tool's annotations. */
function modeOf(annotations: {
  readonly readOnlyHint: boolean;
  readonly destructiveHint?: boolean;
}): string {
  if (annotations.readOnlyHint) return "read";
  return annotations.destructiveHint === true ? "write!" : "write";
}

/**
 * Formatters for the `reference` capabilities level.
 *
 * All modes render FROM the `tools/list` payload — json IS that payload
 * byte-for-byte (the mirror invariant); the others are views.
 */
const referenceFormatters: Formatters<ReferencePayload> = {
  plain: (payload) => {
    const nameWidth = Math.max(
      ...payload.tools.map((tool) => tool.name.length),
      4,
    );
    const lines: string[] = [
      `${chalk.bold(`Tools (${payload.tools.length})`)} ${chalk.dim("— mirror of MCP tools/list")}`,
      "",
      ...payload.tools.map(
        (tool) =>
          `${chalk.cyan(tool.name.padEnd(nameWidth))}  ${modeOf(tool.annotations).padEnd(6)}  ${chalk.dim(tool.description)}`,
      ),
      "",
      chalk.dim(
        "Parameter schemas live in the JSON payload: `pragma capabilities --detail reference --format json`.",
      ),
    ];
    return lines.join("\n");
  },
  llm: (payload) =>
    [
      `## Tools (${payload.tools.length})`,
      "",
      ...payload.tools.map(
        (tool) =>
          `- **${tool.name}** (${modeOf(tool.annotations)}) — ${tool.description}`,
      ),
    ].join("\n"),
  json: (payload) => JSON.stringify(payload, null, 2),
};

export default referenceFormatters;
