import chalk from "chalk";
import { formatHeading, formatSection } from "#pipeline";
import compactUri from "../../shared/compactUri.js";
import type { Formatters } from "../../shared/formatters.js";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import type { OntologyDetailed } from "../../shared/types/index.js";

/**
 * Formatters for `pragma ontology show` output.
 *
 * - **plain**: chalk-styled heading with Classes and Properties sections.
 * - **llm**: condensed Markdown with `### Classes` and `### Properties` sub-headings.
 * - **json**: serialized {@link OntologyDetailed} as indented JSON.
 */
const formatters: Formatters<OntologyDetailed> = {
  plain(data) {
    const lines: string[] = [];

    lines.push(
      formatHeading(
        `${data.prefix}: ${compactUri(data.namespace, PREFIX_MAP)}`,
      ),
    );

    if (data.classes.length > 0) {
      const classLines = data.classes
        .map((c) => {
          const sup = c.superclass
            ? chalk.dim(` extends ${compactUri(c.superclass, PREFIX_MAP)}`)
            : "";
          return `  ${chalk.bold(c.label)} ${chalk.dim(`(${compactUri(c.uri, PREFIX_MAP)})`)}${sup}`;
        })
        .join("\n");
      lines.push("");
      lines.push(formatSection("Classes", classLines));
    }

    if (data.properties.length > 0) {
      const propLines = data.properties
        .map((p) => {
          const domain = p.domain
            ? chalk.dim(` domain: ${compactUri(p.domain, PREFIX_MAP)}`)
            : "";
          const range = p.range
            ? chalk.dim(` range: ${compactUri(p.range, PREFIX_MAP)}`)
            : "";
          return `  ${chalk.bold(p.label)} ${chalk.dim(`(${compactUri(p.uri, PREFIX_MAP)})`)} (${p.type})${domain}${range}`;
        })
        .join("\n");
      lines.push("");
      lines.push(formatSection("Properties", propLines));
    }

    return lines.join("\n");
  },

  llm(data) {
    const lines = [
      `## ${data.prefix}: ${compactUri(data.namespace, PREFIX_MAP)}`,
      "",
    ];

    if (data.classes.length > 0) {
      lines.push("### Classes");
      for (const c of data.classes) {
        const sup = c.superclass
          ? ` extends ${compactUri(c.superclass, PREFIX_MAP)}`
          : "";
        lines.push(
          `- \`${compactUri(c.uri, PREFIX_MAP)}\` — **${c.label}**${sup}`,
        );
      }
      lines.push("");
    }

    if (data.properties.length > 0) {
      lines.push("### Properties");
      for (const p of data.properties) {
        const domain = p.domain
          ? ` domain: ${compactUri(p.domain, PREFIX_MAP)}`
          : "";
        const range = p.range
          ? ` range: ${compactUri(p.range, PREFIX_MAP)}`
          : "";
        lines.push(
          `- \`${compactUri(p.uri, PREFIX_MAP)}\` — **${p.label}** (${p.type})${domain}${range}`,
        );
      }
    }

    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data, null, 2);
  },
};

export default formatters;
