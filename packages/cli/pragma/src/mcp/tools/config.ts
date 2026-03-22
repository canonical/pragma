/**
 * MCP config tools — config_show.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { estimateTokens, wrapTool } from "../utils/index.js";

/**
 * Register config_show tool.
 */
export function registerConfigTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "config_show",
    {
      description:
        "Show current pragma configuration (tier and channel settings).",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const data = {
        tier: rt.config.tier ?? null,
        channel: rt.config.channel,
      };

      if (condensed) {
        const text = `Config: tier=${data.tier ?? "(none)"} channel=${data.channel}`;
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data };
    }),
  );
}
