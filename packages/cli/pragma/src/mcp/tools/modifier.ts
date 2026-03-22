/**
 * MCP modifier tools — modifier_list, modifier_get.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getFormatters as modifierGetFmt,
  listFormatters as modifierListFmt,
} from "../../domains/modifier/formatters/index.js";
import {
  getModifier,
  listModifiers,
} from "../../domains/modifier/operations/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import estimateTokens from "../estimateTokens.js";
import wrapTool from "../wrapTool.js";

/**
 * Register modifier_list and modifier_get tools.
 */
export function registerModifierTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "modifier_list",
    {
      description: "List all modifier families with their values.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await listModifiers(rt.store);

      if (condensed) {
        const text = modifierListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  server.registerTool(
    "modifier_get",
    {
      description: "Get a modifier family and its values.",
      inputSchema: z.object({
        name: z.string().describe("Modifier family name (e.g. 'importance')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, condensed }) => {
      const result = await getModifier(rt.store, name as string);

      if (condensed) {
        const text = modifierGetFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );
}
