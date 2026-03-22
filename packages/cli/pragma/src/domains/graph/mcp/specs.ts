/**
 * MCP tool specs for graph domain — graph_query, graph_inspect.
 */

import type { ToolSpec } from "../../shared/ToolSpec.js";
import { executeQuery, inspectUri } from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "graph_query",
    description:
      "Execute a SPARQL query against the knowledge graph. Returns raw query results. Use ontology_list to discover available namespaces and prefixes.",
    params: {
      sparql: {
        type: "string",
        description: "SPARQL query string",
        optional: false,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, params) {
      const result = await executeQuery(rt.store, params.sparql as string);

      if (params.condensed) {
        const text = JSON.stringify(result, null, 2);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data: result };
    },
  },
  {
    name: "graph_inspect",
    description:
      "Inspect a URI in the knowledge graph. Returns all predicates and objects for the given subject.",
    params: {
      uri: {
        type: "string",
        description: "URI to inspect (full or prefixed, e.g. 'ds:Button')",
        optional: false,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, params) {
      const result = await inspectUri(rt.store, params.uri as string);

      if (params.condensed) {
        const lines = [`## ${result.uri}`, ""];
        for (const g of result.groups) {
          lines.push(`**${g.predicate}:**`);
          for (const o of g.objects) {
            lines.push(`  - ${o}`);
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
