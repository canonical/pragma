/**
 * MCP standard tools — standard_list, standard_lookup, standard_batch_lookup, standard_categories.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PragmaError } from "#error";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import type {
  BatchResult,
  Disclosure,
  StandardDetailed,
} from "../../domains/shared/types.js";
import {
  categoriesFormatters as standardCatFmt,
  listFormatters as standardListFmt,
  lookupFormatters as standardLookupFmt,
} from "../../domains/standard/formatters/index.js";
import type { StandardListOutput } from "../../domains/standard/formatters/types.js";
import {
  listCategories,
  listStandards,
  lookupStandard,
} from "../../domains/standard/operations/index.js";
import { estimateTokens, wrapTool } from "../utils/index.js";

/**
 * Register standard_list, standard_lookup, and standard_categories tools.
 */
export function registerStandardTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "standard_list",
    {
      description:
        "List code standards. Optionally filter by category or search term. Use digest/detailed for progressive disclosure.",
      inputSchema: z.object({
        category: z.string().optional().describe("Filter by category name"),
        search: z
          .string()
          .optional()
          .describe("Search in name and description"),
        digest: z
          .boolean()
          .optional()
          .describe("Show description and first example for each standard"),
        detailed: z
          .boolean()
          .optional()
          .describe("Show full dos/donts for each standard"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(
      runtime,
      async (rt, { category, search, digest, detailed, condensed }) => {
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

        const disclosure: Disclosure = detailed
          ? { level: "detailed" }
          : digest
            ? { level: "digest" }
            : { level: "summary" };

        let details: (StandardDetailed | null)[] | undefined;

        if (disclosure.level !== "summary") {
          details = await Promise.all(
            result.map((s) =>
              lookupStandard(rt.store, s.name).catch(() => null),
            ),
          );
        }

        const output: StandardListOutput = {
          items: result,
          details,
          disclosure,
        };

        if (condensed) {
          const text = standardListFmt.llm(output);
          return { condensed: true, text, tokens: estimateTokens(text) };
        }

        if (disclosure.level === "summary") {
          return { data: result, meta: { count: result.length } };
        }

        // Return enriched data for digest/detailed
        return {
          data: JSON.parse(standardListFmt.json(output)),
          meta: { count: result.length, disclosure: disclosure.level },
        };
      },
    ),
  );

  server.registerTool(
    "standard_lookup",
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
      const result = await lookupStandard(rt.store, name as string);
      const showDetailed = (detailed as boolean | undefined) ?? true;

      if (condensed) {
        const text = standardLookupFmt.llm({
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

  server.registerTool(
    "standard_batch_lookup",
    {
      description:
        "Look up multiple standards by name in a single call. Returns results and errors for names that were not found.",
      inputSchema: z.object({
        names: z.array(z.string()).describe("Standard names to look up"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { names }) => {
      const results: StandardDetailed[] = [];
      const errors: { name: string; code: string; message: string }[] = [];

      await Promise.all(
        (names as string[]).map(async (name) => {
          try {
            results.push(await lookupStandard(rt.store, name));
          } catch (err) {
            if (err instanceof PragmaError) {
              errors.push({ name, code: err.code, message: err.message });
            } else {
              throw err;
            }
          }
        }),
      );

      const batch: BatchResult<StandardDetailed> = { results, errors };
      return { data: batch, meta: { count: results.length } };
    }),
  );
}
