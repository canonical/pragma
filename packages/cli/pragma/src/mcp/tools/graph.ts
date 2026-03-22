/**
 * MCP graph tools — graph_query, graph_inspect.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  executeQuery,
  inspectUri,
} from "../../domains/graph/operations/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import estimateTokens from "../estimateTokens.js";
import wrapTool from "../wrapTool.js";

/**
 * Register graph_query and graph_inspect tools.
 */
export function registerGraphTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "graph_query",
    {
      description:
        "Execute a SPARQL query against the knowledge graph. Returns raw query results. Use ontology_list to discover available namespaces and prefixes.",
      inputSchema: z.object({
        sparql: z.string().describe("SPARQL query string"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { sparql, condensed }) => {
      const result = await executeQuery(rt.store, sparql as string);

      if (condensed) {
        const text = JSON.stringify(result, null, 2);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  server.registerTool(
    "graph_inspect",
    {
      description:
        "Inspect a URI in the knowledge graph. Returns all predicates and objects for the given subject.",
      inputSchema: z.object({
        uri: z
          .string()
          .describe("URI to inspect (full or prefixed, e.g. 'ds:Button')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { uri, condensed }) => {
      const result = await inspectUri(rt.store, uri as string);

      if (condensed) {
        const lines = [`## ${result.uri}`, ""];
        for (const g of result.groups) {
          lines.push(`**${g.predicate}:**`);
          for (const o of g.objects) {
            lines.push(`  - ${o}`);
          }
        }
        const text = lines.join("\n");
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );
}
