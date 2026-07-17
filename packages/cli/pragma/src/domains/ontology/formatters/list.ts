import chalk from "chalk";
import type { Formatters } from "../../shared/formatters.js";
import type { OntologySummary } from "../../shared/types/index.js";

/**
 * Formatters for `pragma ontology list` output.
 *
 * One line per namespace mirroring the `ontology show` summary line —
 * name, metadata, and split counts — plus a next-command footer, so the
 * list is the entry point of the same drill-down path
 * (`list → show <prefix> → show <prefix> --class <Class>`).
 *
 * - **plain**: chalk-styled lines with counts and a dimmed footer.
 * - **llm**: the same content as condensed Markdown bullets.
 * - **json**: the {@link OntologySummary} array itself.
 */
const formatters: Formatters<readonly OntologySummary[]> = {
  plain(ontologies) {
    const lines = ontologies.map(
      (o) =>
        `${chalk.bold(prefixLabel(o))} ${o.namespace} ${chalk.dim(`— ${summaryLine(o)}`)}`,
    );
    lines.push("");
    lines.push(chalk.dim("Next: pragma ontology show <prefix>"));
    return lines.join("\n");
  },

  llm(ontologies) {
    const lines = ["## Ontologies", ""];
    for (const o of ontologies) {
      lines.push(
        `- **${prefixLabel(o)}** \`${o.namespace}\` — ${summaryLine(o)}`,
      );
    }
    lines.push("");
    lines.push("Next: `ontology show <prefix>` for the class hierarchy.");
    return lines.join("\n");
  },

  json(ontologies) {
    return JSON.stringify(ontologies, null, 2);
  },
};

export default formatters;

/** `ds:` for prefixed namespaces, a placeholder for unprefixed ones. */
function prefixLabel(o: OntologySummary): string {
  return o.prefix ? `${o.prefix}:` : "(no prefix)";
}

/** The same counts-and-metadata line `ontology show` leads with. */
function summaryLine(o: OntologySummary): string {
  const parts = [
    `${o.classCount} classes`,
    `${o.relationCount} relations`,
    `${o.attributeCount} attributes`,
  ];
  if (o.shapeCount > 0) parts.push(`${o.shapeCount} shapes`);
  if (o.anatomyCount > 0) parts.push(`${o.anatomyCount} anatomies`);
  if (o.version) parts.push(`v${o.version}`);
  if (o.title) parts.push(o.title);
  return parts.join(" · ");
}
