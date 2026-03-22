/**
 * MCP block tools — block_list, block_lookup, block_batch_lookup.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PragmaError } from "#error";
import {
  listFormatters as blockListFmt,
  lookupFormatters as blockLookupFmt,
} from "../../domains/block/formatters/index.js";
import {
  listBlocks,
  lookupBlock,
} from "../../domains/block/operations/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import type { BatchResult, BlockDetailed } from "../../domains/shared/types.js";
import { estimateTokens, wrapTool } from "../utils/index.js";
import { buildFilters, describeFilters } from "./helpers.js";

/**
 * Register block_list, block_lookup, and block_batch_lookup tools.
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
    wrapTool(runtime, async (rt, { allTiers, digest, detailed, condensed }) => {
      const filters = buildFilters(rt, allTiers as boolean | undefined);
      const summaries = await listBlocks(rt.store, filters);

      if (condensed) {
        const text = blockListFmt.llm(summaries);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      if (detailed) {
        const enriched = await Promise.all(
          summaries.map((s) => lookupBlock(rt.store, s.name, filters)),
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
          summaries.map((s) => lookupBlock(rt.store, s.name, filters)),
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
    }),
  );

  server.registerTool(
    "block_lookup",
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
      const result = await lookupBlock(rt.store, name as string, filters);
      const showDetailed = (detailed as boolean | undefined) ?? true;

      if (condensed) {
        const text = blockLookupFmt.llm({
          block: result,
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

  server.registerTool(
    "block_batch_lookup",
    {
      description:
        "Look up multiple blocks by name in a single call. Returns results and errors for names that were not found.",
      inputSchema: z.object({
        names: z
          .array(z.string())
          .describe("Block names to look up (e.g. ['Button', 'Card'])"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { names }) => {
      const filters = buildFilters(rt);
      const results: BlockDetailed[] = [];
      const errors: { name: string; code: string; message: string }[] = [];

      await Promise.all(
        (names as string[]).map(async (name) => {
          try {
            results.push(await lookupBlock(rt.store, name, filters));
          } catch (err) {
            if (err instanceof PragmaError) {
              errors.push({ name, code: err.code, message: err.message });
            } else {
              throw err;
            }
          }
        }),
      );

      const batch: BatchResult<BlockDetailed> = { results, errors };
      return { data: batch, meta: { count: results.length } };
    }),
  );
}
