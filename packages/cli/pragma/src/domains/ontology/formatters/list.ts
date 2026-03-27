import chalk from "chalk";
import compactUri from "../../shared/compactUri.js";
import type { Formatters } from "../../shared/formatters.js";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import type { OntologySummary } from "../../shared/types/index.js";

/**
 * Formatters for `pragma ontology list` output.
 *
 * - **plain**: one line per ontology with chalk-styled prefix, namespace, and counts.
 * - **llm**: condensed Markdown bullet list under an `## Ontologies` heading.
 * - **json**: serialized ontology summary array as indented JSON.
 */
const formatters: Formatters<readonly OntologySummary[]> = {
  plain(ontologies) {
    return ontologies
      .map(
        (o) =>
          `${chalk.bold(`${o.prefix}:`)} ${compactUri(o.namespace, PREFIX_MAP)} classes: ${o.classCount} properties: ${o.propertyCount} anatomy: ${o.anatomyCount}`,
      )
      .join("\n");
  },

  llm(ontologies) {
    const lines = ["## Ontologies", ""];
    for (const o of ontologies) {
      lines.push(
        `- **${o.prefix}:** \`${compactUri(o.namespace, PREFIX_MAP)}\` | classes: ${o.classCount} | properties: ${o.propertyCount} | anatomy: ${o.anatomyCount}`,
      );
    }
    return lines.join("\n");
  },

  json(ontologies) {
    return JSON.stringify(ontologies, null, 2);
  },
};

export default formatters;
