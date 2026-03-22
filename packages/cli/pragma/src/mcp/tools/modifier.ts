/**
 * MCP modifier tools — modifier_list, modifier_lookup, modifier_batch_lookup.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PragmaError } from "#error";
import {
  listFormatters as modifierListFmt,
  lookupFormatters as modifierLookupFmt,
} from "../../domains/modifier/formatters/index.js";
import {
  listModifiers,
  lookupModifier,
} from "../../domains/modifier/operations/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import type {
  BatchResult,
  ModifierFamily,
} from "../../domains/shared/types.js";
import { estimateTokens, wrapTool } from "../utils/index.js";

/**
 * Register modifier_list, modifier_lookup, and modifier_batch_lookup tools.
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
    "modifier_lookup",
    {
      description: "Get a modifier family and its values.",
      inputSchema: z.object({
        name: z.string().describe("Modifier family name (e.g. 'importance')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, condensed }) => {
      const result = await lookupModifier(rt.store, name as string);

      if (condensed) {
        const text = modifierLookupFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  server.registerTool(
    "modifier_batch_lookup",
    {
      description:
        "Look up multiple modifier families by name in a single call. Returns results and errors for names that were not found.",
      inputSchema: z.object({
        names: z.array(z.string()).describe("Modifier family names to look up"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { names }) => {
      const results: ModifierFamily[] = [];
      const errors: { name: string; code: string; message: string }[] = [];

      await Promise.all(
        (names as string[]).map(async (name) => {
          try {
            results.push(await lookupModifier(rt.store, name));
          } catch (err) {
            if (err instanceof PragmaError) {
              errors.push({ name, code: err.code, message: err.message });
            } else {
              throw err;
            }
          }
        }),
      );

      const batch: BatchResult<ModifierFamily> = { results, errors };
      return { data: batch, meta: { count: results.length } };
    }),
  );
}
