import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { StateEntry, StatePayload } from "../../shared/state/index.js";

/** Render a state value: string, string list, or unset. */
function renderValue(value: StateEntry["value"]): string {
  if (value === null) return "(unset)";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "(none)";
  }
  return String(value);
}

/** The four entries in payload order. */
function entriesOf(payload: StatePayload): [string, StateEntry][] {
  return Object.entries(payload.state);
}

/**
 * Formatters for the `state` capabilities level.
 *
 * All modes render FROM the `pragma://state` payload — json IS that
 * payload byte-for-byte (the mirror invariant); the others are views.
 */
const stateFormatters: Formatters<StatePayload> = {
  plain: (payload) => {
    const lines: string[] = [
      `${chalk.bold("Pragma state")} ${chalk.dim(`(pragma://state) · v${payload.version}`)}`,
      "",
    ];
    for (const [name, entry] of entriesOf(payload)) {
      lines.push(
        `${chalk.cyan(name.padEnd(8))}  ${renderValue(entry.value)}  ${chalk.dim(`[${entry.origin}]`)}`,
      );
      lines.push(`  ${chalk.dim(entry.effect)}`);
      lines.push(`  ${chalk.dim("change:")}   ${entry.change.durable}`);
      if (entry.change.perCall) {
        lines.push(`  ${chalk.dim("per-call:")} ${entry.change.perCall}`);
      }
      lines.push("");
    }
    lines.push(
      chalk.dim(
        "Run `pragma capabilities --detail prompts|reference` for the other surfaces.",
      ),
    );
    return lines.join("\n");
  },
  llm: (payload) =>
    [
      `## Pragma state (pragma://state) · v${payload.version}`,
      "",
      ...entriesOf(payload).flatMap(([name, entry]) => [
        `- **${name}**: ${renderValue(entry.value)} (origin: ${entry.origin})`,
        `  - effect: ${entry.effect}`,
        `  - change: ${entry.change.durable}`,
        ...(entry.change.perCall
          ? [`  - per-call: ${entry.change.perCall}`]
          : []),
      ]),
    ].join("\n"),
  json: (payload) => JSON.stringify(payload, null, 2),
};

export default stateFormatters;
