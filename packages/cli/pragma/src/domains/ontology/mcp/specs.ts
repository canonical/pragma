/**
 * MCP tool specs for the ontology domain.
 */

import type { ToolSpec } from "../../shared/ToolSpec.js";
import { listOntologies, showOntology } from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "ontology_list",
    description:
      "List all ontologies loaded in the knowledge graph with class and property counts.",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { condensed }) {
      const result = await listOntologies(rt.store);

      if (condensed) {
        const lines = ["## Ontologies", ""];
        for (const o of result) {
          lines.push(
            `- **${o.prefix}:** (${o.namespace}) | classes: ${o.classCount} | properties: ${o.propertyCount}`,
          );
        }
        const text = lines.join("\n");
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data: result, meta: { count: result.length } };
    },
  },
  {
    name: "ontology_show",
    description:
      "Show detailed schema for an ontology including classes and properties.",
    params: {
      prefix: {
        type: "string",
        description: "Ontology prefix (e.g. 'ds', 'cs')",
        optional: false,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { prefix, condensed }) {
      const result = await showOntology(rt.store, prefix as string);

      if (condensed) {
        const lines = [`## ${result.prefix}: (${result.namespace})`, ""];
        if (result.classes.length > 0) {
          lines.push("### Classes");
          for (const c of result.classes) {
            const sup = c.superclass ? ` extends ${c.superclass}` : "";
            lines.push(`- **${c.label}**${sup}`);
          }
          lines.push("");
        }
        if (result.properties.length > 0) {
          lines.push("### Properties");
          for (const p of result.properties) {
            const domain = p.domain ? ` domain: ${p.domain}` : "";
            const range = p.range ? ` range: ${p.range}` : "";
            lines.push(`- **${p.label}** (${p.type})${domain}${range}`);
          }
        }
        const text = lines.join("\n");
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data: result };
    },
  },
];

export default specs;
