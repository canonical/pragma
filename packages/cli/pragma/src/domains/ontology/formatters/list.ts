import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { OntologySummary } from "../../shared/types.js";

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
          `${chalk.bold(o.prefix)} ${chalk.dim(`(${o.namespace})`)} classes: ${o.classCount} properties: ${o.propertyCount} anatomy: ${o.anatomyCount}`,
      )
      .join("\n");
  },

  llm(ontologies) {
    const lines = ["## Ontologies", ""];
    for (const o of ontologies) {
      lines.push(
        `- **${o.prefix}:** (${o.namespace}) | classes: ${o.classCount} | properties: ${o.propertyCount} | anatomy: ${o.anatomyCount}`,
      );
    }
    return lines.join("\n");
  },

  json(ontologies) {
    return JSON.stringify(ontologies, null, 2);
  },
};

export default formatters;
