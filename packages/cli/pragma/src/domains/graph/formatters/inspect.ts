/**
 * Formatters for `pragma graph inspect` output.
 */

import chalk from "chalk";
import { formatHeading } from "#pipeline";
import type { Formatters } from "../../shared/formatters.js";
import type { InspectResult } from "../../shared/types.js";

const formatters: Formatters<InspectResult> = {
  plain(result) {
    const lines: string[] = [];
    lines.push(formatHeading(result.uri));

    for (const g of result.groups) {
      lines.push("");
      lines.push(chalk.bold(g.predicate));
      for (const o of g.objects) {
        lines.push(`  ${o}`);
      }
    }

    return lines.join("\n");
  },

  llm(result) {
    const lines = [`## ${result.uri}`, ""];
    for (const g of result.groups) {
      lines.push(`**${g.predicate}:**`);
      for (const o of g.objects) {
        lines.push(`  - ${o}`);
      }
    }
    return lines.join("\n");
  },

  json(result) {
    return JSON.stringify(result, null, 2);
  },
};

export default formatters;
