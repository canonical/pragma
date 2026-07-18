/**
 * Formatters for `ontology list` and `ontology show`.
 */

import { compactUri } from "../../kernel/render/compactUri.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { Formatters } from "../../kernel/spec/types.js";
import type {
  OntologyClass,
  OntologyProperty,
  OntologyShowData,
  OntologySummary,
} from "./queries.js";

export const ontologyListFormatters: Formatters<OntologySummary[]> = {
  plain: (rows) =>
    rows
      .map(
        (r) =>
          `${r.prefix}  ${compactUri(r.namespace, DEFAULT_PREFIX_MAP)}  ${r.classCount} classes, ${r.propertyCount} properties`,
      )
      .join("\n"),
  llm: (rows) =>
    [
      `## Ontologies (${rows.length})`,
      "",
      ...rows.map(
        (r) =>
          `- \`${r.prefix}\` — ${r.classCount} classes, ${r.propertyCount} properties (\`${r.namespace}\`)`,
      ),
    ].join("\n"),
  json: (rows) => JSON.stringify(rows, null, 2),
};

/** Render a URI compacted or full, per the show flags. */
function uri(value: string, full: boolean): string {
  return full ? value : compactUri(value, DEFAULT_PREFIX_MAP);
}

function classLine(c: OntologyClass, full: boolean, bullet: string): string {
  const sup = c.superclass ? ` extends ${uri(c.superclass, full)}` : "";
  const count = c.instanceCount > 0 ? ` [${c.instanceCount}]` : "";
  return `${bullet}${c.label} (${uri(c.uri, full)})${sup}${count}`;
}

function propLine(p: OntologyProperty, full: boolean, bullet: string): string {
  const domain = p.domain ? ` domain: ${uri(p.domain, full)}` : "";
  const range = p.range ? ` range: ${uri(p.range, full)}` : "";
  return `${bullet}${p.label} (${uri(p.uri, full)}) (${p.type})${domain}${range}`;
}

export const ontologyShowFormatters: Formatters<OntologyShowData> = {
  plain(data) {
    const title = `${data.prefix}: ${compactUri(data.namespace, DEFAULT_PREFIX_MAP)}${data.focus ? ` — ${data.focus}` : ""}`;
    const lines = [title, "═".repeat(Math.max(title.length, 24))];
    if (data.classes.length > 0) {
      lines.push("", "Classes:");
      for (const c of data.classes)
        lines.push(classLine(c, data.fullUris, "  "));
    }
    if (data.properties.length > 0) {
      lines.push("", "Properties:");
      for (const p of data.properties)
        lines.push(propLine(p, data.fullUris, "  "));
    }
    return lines.join("\n");
  },
  llm(data) {
    const lines = [
      `## ${data.prefix}: ${compactUri(data.namespace, DEFAULT_PREFIX_MAP)}${data.focus ? ` — ${data.focus}` : ""}`,
      "",
    ];
    if (data.classes.length > 0) {
      lines.push("### Classes");
      for (const c of data.classes)
        lines.push(classLine(c, data.fullUris, "- "));
      lines.push("");
    }
    if (data.properties.length > 0) {
      lines.push("### Properties");
      for (const p of data.properties)
        lines.push(propLine(p, data.fullUris, "- "));
    }
    return lines.join("\n").trimEnd();
  },
  json: (data) => JSON.stringify(data, null, 2),
};
