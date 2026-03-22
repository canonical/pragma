/**
 * MCP token tools — token_list, token_get.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import {
  createGetFormatters as createTokenGetFmt,
  listFormatters as tokenListFmt,
} from "../../domains/token/formatters/index.js";
import { getToken, listTokens } from "../../domains/token/operations/index.js";
import estimateTokens from "../estimateTokens.js";
import wrapTool from "../wrapTool.js";

/**
 * Register token_list and token_get tools.
 */
export function registerTokenTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "token_list",
    {
      description:
        "List all design tokens. Optionally filter by category (token type).",
      inputSchema: z.object({
        category: z
          .string()
          .optional()
          .describe("Filter by token type (e.g., Color, Dimension)"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { category, condensed }) => {
      const result = await listTokens(rt.store, {
        category: category as string | undefined,
      });

      if (condensed) {
        const text = tokenListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  server.registerTool(
    "token_get",
    {
      description:
        "Get detailed information about a design token including theme values.",
      inputSchema: z.object({
        name: z.string().describe("Token name (e.g. 'color.primary')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, condensed }) => {
      const result = await getToken(rt.store, name as string);

      if (condensed) {
        const fmt = createTokenGetFmt({ detailed: true });
        const text = fmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );
}
