/**
 * MCP tool specs for the block domain — block_list, block_lookup, block_batch_lookup.
 *
 * Declarative definitions — no MCP imports. The adapter layer
 * converts these into registered MCP tools via `registerFromSpec()`.
 */

import { PragmaError } from "#error";
import {
  buildFilterConfig,
  describeFilters,
} from "../../shared/filters/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import type { BatchResult, BlockDetailed } from "../../shared/types.js";
import {
  listFormatters as blockListFmt,
  lookupFormatters as blockLookupFmt,
} from "../formatters/index.js";
import { listBlocks, lookupBlock } from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "block_list",
    description:
      "List design system blocks visible under current tier and channel configuration.",
    params: {
      allTiers: {
        type: "boolean",
        description: "Show blocks from all tiers, ignoring tier filter",
        optional: true,
      },
      digest: {
        type: "boolean",
        description: "Include implementations per block",
        optional: true,
      },
      detailed: {
        type: "boolean",
        description: "Include full details per block",
        optional: true,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { allTiers, digest, detailed, condensed }) {
      const filters = buildFilterConfig(rt, allTiers as boolean | undefined);
      const summaries = await listBlocks(rt.store, filters);

      if (condensed) {
        const text = blockListFmt.llm(summaries);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
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
    },
  },

  {
    name: "block_lookup",
    description:
      "Get detailed information about a design system block including anatomy, modifiers, tokens, and applicable standards.",
    params: {
      name: {
        type: "string",
        description: "Block name (e.g. 'Button')",
        optional: false,
      },
      detailed: {
        type: "boolean",
        description: "Return full details (default: true for MCP)",
        optional: true,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { name, detailed, condensed }) {
      const filters = buildFilterConfig(rt);
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
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
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
    },
  },

  {
    name: "block_batch_lookup",
    description:
      "Look up multiple blocks by name in a single call. Returns results and errors for names that were not found.",
    params: {
      names: {
        type: "string[]",
        description: "Block names to look up (e.g. ['Button', 'Card'])",
        optional: false,
      },
    },
    readOnly: true,
    async execute(rt, { names }) {
      const filters = buildFilterConfig(rt);
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
    },
  },
] as const;

export default specs;
