/**
 * MCP tier tools — tier_list.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { listFormatters as tierListFmt } from "../../domains/tier/formatters/index.js";
import { listTiers } from "../../domains/tier/operations/index.js";
import estimateTokens from "../estimateTokens.js";
import wrapTool from "../wrapTool.js";

/**
 * Register tier_list tool.
 */
export function registerTierTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "tier_list",
    {
      description:
        "List all tiers in the design system ontology with hierarchy.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await listTiers(rt.store);

      if (condensed) {
        const text = tierListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );
}
