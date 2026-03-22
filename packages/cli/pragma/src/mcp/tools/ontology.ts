/**
 * MCP ontology tools — ontology_list, ontology_show.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listOntologies,
  showOntology,
} from "../../domains/ontology/operations/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { estimateTokens, wrapTool } from "../utils/index.js";

/**
 * Register ontology_list and ontology_show tools.
 */
export function registerOntologyTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "ontology_list",
    {
      description:
        "List all ontologies loaded in the knowledge graph with class and property counts.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await listOntologies(rt.store);

      if (condensed) {
        const lines = ["## Ontologies", ""];
        for (const o of result) {
          lines.push(
            `- **${o.prefix}:** (${o.namespace}) | classes: ${o.classCount} | properties: ${o.propertyCount}`,
          );
        }
        const text = lines.join("\n");
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  server.registerTool(
    "ontology_show",
    {
      description:
        "Show detailed schema for an ontology including classes and properties.",
      inputSchema: z.object({
        prefix: z.string().describe("Ontology prefix (e.g. 'ds', 'cs')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { prefix, condensed }) => {
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
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );
}
