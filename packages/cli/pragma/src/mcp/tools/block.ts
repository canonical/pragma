/**
 * MCP block tools — block_list, block_get.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getFormatters as blockGetFmt,
  listFormatters as blockListFmt,
} from "../../domains/block/formatters/index.js";
import { getBlock, listBlocks } from "../../domains/block/operations/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { estimateTokens, wrapTool } from "../utils/index.js";
import { buildFilters, describeFilters } from "./helpers.js";

/**
 * Register block_list and block_get tools.
 */
export function registerBlockTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "block_list",
    {
      description:
        "List design system blocks visible under current tier and channel configuration.",
      inputSchema: z.object({
        allTiers: z
          .boolean()
          .optional()
          .describe("Show blocks from all tiers, ignoring tier filter"),
        names: z
          .array(z.string())
          .optional()
          .describe(
            "Filter to specific block names. Returns partial results for unknown names.",
          ),
        digest: z
          .boolean()
          .optional()
          .describe("Include implementations per block"),
        detailed: z
          .boolean()
          .optional()
          .describe("Include full details per block"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(
      runtime,
      async (rt, { allTiers, names, digest, detailed, condensed }) => {
        const filters = buildFilters(rt, allTiers as boolean | undefined);
        let summaries = await listBlocks(rt.store, filters);

        if (names && Array.isArray(names) && names.length > 0) {
          const nameSet = new Set(names as string[]);
          summaries = summaries.filter((s) => nameSet.has(s.name));
        }

        if (condensed) {
          const text = blockListFmt.llm(summaries);
          return { condensed: true, text, tokens: estimateTokens(text) };
        }

        if (detailed) {
          const enriched = await Promise.all(
            summaries.map((s) => getBlock(rt.store, s.name, filters)),
          );
          return {
            data: enriched,
            meta: {
              count: enriched.length,
              disclosure: "detailed",
              filters: describeFilters(filters),
            },
          };
        }

        if (digest) {
          const enriched = await Promise.all(
            summaries.map((s) => getBlock(rt.store, s.name, filters)),
          );
          const digestData = enriched.map((d) => ({
            uri: d.uri,
            name: d.name,
            tier: d.tier,
            modifiers: d.modifiers,
            implementations: d.implementations,
            nodeCount: d.nodeCount,
            tokenCount: d.tokenCount,
            implementationPaths: d.implementationPaths,
          }));
          return {
            data: digestData,
            meta: {
              count: digestData.length,
              disclosure: "digest",
              filters: describeFilters(filters),
            },
          };
        }

        return {
          data: summaries,
          meta: { count: summaries.length, filters: describeFilters(filters) },
        };
      },
    ),
  );

  server.registerTool(
    "block_get",
    {
      description:
        "Get detailed information about a design system block including anatomy, modifiers, tokens, and applicable standards.",
      inputSchema: z.object({
        name: z.string().describe("Block name (e.g. 'Button')"),
        detailed: z
          .boolean()
          .optional()
          .describe("Return full details (default: true for MCP)"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, detailed, condensed }) => {
      const filters = buildFilters(rt);
      const result = await getBlock(rt.store, name as string, filters);
      const showDetailed = (detailed as boolean | undefined) ?? true;

      if (condensed) {
        const text = blockGetFmt.llm({
          component: result,
          detailed: showDetailed,
          aspects: {
            anatomy: true,
            modifiers: true,
            tokens: true,
            implementations: true,
          },
        });
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      if (!showDetailed) {
        const {
          uri,
          name: n,
          tier,
          modifiers,
          implementations,
          nodeCount,
          tokenCount,
        } = result;
        return {
          data: {
            uri,
            name: n,
            tier,
            modifiers,
            implementations,
            nodeCount,
            tokenCount,
          },
        };
      }

      return { data: result };
    }),
  );
}
