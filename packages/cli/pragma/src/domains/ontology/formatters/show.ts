/**
 * Formatters for `pragma ontology show` output.
 */

import chalk from "chalk";
import { formatHeading, formatSection } from "#pipeline";
import type { Formatters } from "../../shared/formatters.js";
import type { OntologyDetailed } from "../../shared/types.js";

const formatters: Formatters<OntologyDetailed> = {
  plain(data) {
    const lines: string[] = [];

    lines.push(formatHeading(`${data.prefix}: (${data.namespace})`));

    if (data.classes.length > 0) {
      const classLines = data.classes
        .map((c) => {
          const sup = c.superclass ? chalk.dim(` extends ${c.superclass}`) : "";
          return `  ${chalk.bold(c.label)}${sup}`;
        })
        .join("\n");
      lines.push("");
      lines.push(formatSection("Classes", classLines));
    }

    if (data.properties.length > 0) {
      const propLines = data.properties
        .map((p) => {
          const domain = p.domain ? chalk.dim(` domain: ${p.domain}`) : "";
          const range = p.range ? chalk.dim(` range: ${p.range}`) : "";
          return `  ${chalk.bold(p.label)} (${p.type})${domain}${range}`;
        })
        .join("\n");
      lines.push("");
      lines.push(formatSection("Properties", propLines));
    }

    return lines.join("\n");
  },

  llm(data) {
    const lines = [`## ${data.prefix}: (${data.namespace})`, ""];

    if (data.classes.length > 0) {
      lines.push("### Classes");
      for (const c of data.classes) {
        const sup = c.superclass ? ` extends ${c.superclass}` : "";
        lines.push(`- **${c.label}**${sup}`);
      }
      lines.push("");
    }

    if (data.properties.length > 0) {
      lines.push("### Properties");
      for (const p of data.properties) {
        const domain = p.domain ? ` domain: ${p.domain}` : "";
        const range = p.range ? ` range: ${p.range}` : "";
        lines.push(`- **${p.label}** (${p.type})${domain}${range}`);
      }
    }

    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data, null, 2);
  },
};

export default formatters;
