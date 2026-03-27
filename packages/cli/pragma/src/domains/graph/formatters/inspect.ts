import chalk from "chalk";
import { formatHeading } from "#pipeline";
import compactUri from "../../shared/compactUri.js";
import type { Formatters } from "../../shared/formatters.js";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import type { InspectResult } from "../../shared/types/index.js";

/**
 * Formatters for `pragma graph inspect` output.
 *
 * - **plain**: terminal output with chalk-styled URI heading and bold predicates.
 * - **llm**: condensed Markdown with heading and bulleted object lists.
 * - **json**: serialized {@link InspectResult} as indented JSON.
 */
const formatters: Formatters<InspectResult> = {
  plain(result) {
    const lines: string[] = [];
    lines.push(formatHeading(compactUri(result.uri, PREFIX_MAP)));

    for (const g of result.groups) {
      lines.push("");
      lines.push(chalk.bold(compactUri(g.predicate, PREFIX_MAP)));
      for (const o of g.objects) {
        lines.push(`  ${compactUri(o, PREFIX_MAP)}`);
      }
    }

    return lines.join("\n");
  },

  llm(result) {
    const lines = [
      `## ${compactUri(result.uri, PREFIX_MAP)} (${result.uri})`,
      "",
    ];
    for (const g of result.groups) {
      lines.push(`**${compactUri(g.predicate, PREFIX_MAP)}:**`);
      for (const o of g.objects) {
        lines.push(`  - ${compactUri(o, PREFIX_MAP)}`);
      }
    }
    return lines.join("\n");
  },

  json(result) {
    return JSON.stringify(result, null, 2);
  },
};

export default formatters;
