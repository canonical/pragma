/**
 * MCP standard tools — standard_list, standard_get, standard_categories.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import {
  categoriesFormatters as standardCatFmt,
  getFormatters as standardGetFmt,
  listFormatters as standardListFmt,
} from "../../domains/standard/formatters/index.js";
import {
  getStandard,
  listCategories,
  listStandards,
} from "../../domains/standard/operations/index.js";
import estimateTokens from "../estimateTokens.js";
import wrapTool from "../wrapTool.js";

/**
 * Register standard_list, standard_get, and standard_categories tools.
 */
export function registerStandardTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "standard_list",
    {
      description:
        "List code standards. Optionally filter by category or search term.",
      inputSchema: z.object({
        category: z.string().optional().describe("Filter by category name"),
        search: z
          .string()
          .optional()
          .describe("Search in name and description"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { category, search, condensed }) => {
      let result = await listStandards(rt.store);

      if (category) {
        const cat = (category as string).toLowerCase();
        result = result.filter((s) => s.category.toLowerCase() === cat);
      }

      if (search) {
        const term = (search as string).toLowerCase();
        result = result.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.description.toLowerCase().includes(term),
        );
      }

      if (condensed) {
        const text = standardListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  server.registerTool(
    "standard_get",
    {
      description:
        "Get detailed information about a code standard including dos and donts with code examples.",
      inputSchema: z.object({
        name: z
          .string()
          .describe("Standard name (e.g. 'code/function/purity')"),
        detailed: z
          .boolean()
          .optional()
          .describe(
            "Return full details with dos/donts (default: true for MCP)",
          ),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, detailed, condensed }) => {
      const result = await getStandard(rt.store, name as string);
      const showDetailed = (detailed as boolean | undefined) ?? true;

      if (condensed) {
        const text = standardGetFmt.llm({
          standard: result,
          detailed: showDetailed,
        });
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      if (!showDetailed) {
        const { uri, name: n, category, description } = result;
        return { data: { uri, name: n, category, description } };
      }

      return { data: result };
    }),
  );

  server.registerTool(
    "standard_categories",
    {
      description: "List all code standard categories.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await listCategories(rt.store);

      if (condensed) {
        const text = standardCatFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );
}
