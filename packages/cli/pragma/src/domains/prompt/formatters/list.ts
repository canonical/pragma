import type { Formatters } from "../../shared/formatters.js";
import type { PromptListArgument, PromptListEntry } from "../types.js";

/** Render an argument list as `name` / `name?` comma-joined. */
function argsColumn(args: readonly PromptListArgument[] | undefined): string {
  if (!args || args.length === 0) return "";
  return args
    .map((arg) => (arg.required ? arg.name : `${arg.name}?`))
    .join(", ");
}

/**
 * Formatters for `pragma prompt list`.
 *
 * All three modes render FROM the `prompts/list` protocol payload —
 * json IS that payload (the mirror invariant), the others are views.
 */
const listFormatters: Formatters<{ prompts: PromptListEntry[] }> = {
  plain: (payload) => {
    const rows = payload.prompts.map((prompt) => ({
      name: prompt.name,
      args: argsColumn(prompt.arguments),
      description: prompt.description,
    }));
    const nameWidth = Math.max(...rows.map((row) => row.name.length), 4);
    const argsWidth = Math.max(...rows.map((row) => row.args.length), 4);
    return [
      `Prompts (${rows.length})`,
      "",
      ...rows.map((row) =>
        [
          row.name.padEnd(nameWidth),
          row.args.padEnd(argsWidth),
          row.description,
        ]
          .join("  ")
          .trimEnd(),
      ),
      "",
      "Run `pragma prompt lookup <name> [key=value ...]` for the hydrated prompt.",
    ].join("\n");
  },
  llm: (payload) =>
    [
      `## Prompts (${payload.prompts.length})`,
      "",
      ...payload.prompts.map((prompt) => {
        const args = argsColumn(prompt.arguments);
        return `- **${prompt.name}**${args ? ` (${args})` : ""} — ${prompt.description}`;
      }),
    ].join("\n"),
  json: (payload) => JSON.stringify(payload, null, 2),
};

export default listFormatters;
