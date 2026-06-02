/**
 * MCP tool specs for the block domain — block_list, block_lookup.
 *
 * Declarative definitions — no MCP imports. The adapter layer
 * converts these into registered MCP tools via `registerFromSpec()`.
 */

import type { ToolSpec } from "../../shared/ToolSpec.js";
import {
  listFormatters as blockListFmt,
  lookupFormatters as blockLookupFmt,
  sampleFormatters as blockSampleFmt,
} from "../formatters/index.js";
import { sampleBlocks } from "../operations/index.js";
import {
  buildBlockFilters,
  resolveBlockList,
  resolveBlockLookup,
} from "../orchestration/index.js";

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
      const contract = await resolveBlockList(rt, {
        allTiers: allTiers === true,
        digest: digest === true,
        detailed: detailed === true,
      });

      if (condensed) {
        const text = blockListFmt.llm(contract.result.items);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      if (contract.result.disclosure.level === "detailed") {
        return {
          data: contract.result.items,
          meta: {
            count: contract.result.items.length,
            disclosure: "detailed",
            filters: contract.result.filters,
          },
        };
      }

      if (contract.result.disclosure.level === "digest") {
        return {
          data: contract.result.items,
          meta: {
            count: contract.result.items.length,
            disclosure: "digest",
            filters: contract.result.filters,
          },
        };
      }

      return {
        data: contract.result.items,
        meta: {
          count: contract.result.items.length,
          filters: contract.result.filters,
        },
      };
    },
  },

  {
    name: "block_lookup",
    description:
      "Get detailed information about one or more design system blocks including anatomy, modifiers, tokens, and applicable standards.",
    params: {
      names: {
        type: "string[]",
        description:
          "Block names or IRIs to look up (e.g. ['Button', 'ds:global.component.card'])",
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
    async execute(rt, { names, detailed, condensed }) {
      const queries = names as string[];
      const showDetailed = (detailed as boolean | undefined) ?? true;
      const contract = await resolveBlockLookup(
        rt.store,
        queries,
        buildBlockFilters(rt),
      );
      const result = contract.result;

      if (condensed) {
        const textParts = result.results.map((block) =>
          blockLookupFmt.llm({
            block,
            detailed: showDetailed,
            aspects: {
              anatomy: true,
              modifiers: true,
              tokens: true,
              implementations: true,
            },
          }),
        );

        if (result.errors.length > 0) {
          textParts.push(
            [
              "### Errors",
              ...result.errors.map(
                (error) => `- ${error.query}: ${error.message}`,
              ),
            ].join("\n"),
          );
        }

        return {
          condensed: true,
          text: textParts.join("\n\n"),
          tokens: `~${Math.ceil(textParts.join("\n\n").length / 4)}`,
        };
      }

      if (!showDetailed) {
        const summaries = result.results.map(
          ({
            uri,
            name,
            type,
            tier,
            modifiers,
            implementations,
            nodeCount,
            tokenCount,
            summary,
          }) => ({
            uri,
            name,
            type,
            tier,
            modifiers,
            implementations,
            nodeCount,
            tokenCount,
            summary,
          }),
        );

        return {
          data: {
            results: summaries,
            errors: result.errors,
          },
          meta: { count: summaries.length },
        };
      }

      return { data: result, meta: { count: result.results.length } };
    },
  },
  {
    name: "block_sample",
    description:
      "Return 1–5 randomly selected complete block instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.",
    params: {
      count: {
        type: "string",
        description: "Number of samples (1–5, default 2)",
        optional: true,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { count, condensed }) {
      const n = Number(count ?? 2);
      const filters = buildBlockFilters(rt);
      const result = await sampleBlocks(rt.store, filters, n);
      const nextSteps = [
        `These are ${result.samples.length} of ${result.totalCount} total blocks.`,
        "Use block_lookup to inspect specific blocks by name.",
        "Use block_list to see all available blocks with filtering.",
      ];

      if (condensed) {
        const text = blockSampleFmt.llm({ ...result, nextSteps });
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return {
        data: {
          samples: result.samples,
          totalCount: result.totalCount,
          nextSteps,
        },
        meta: { count: result.samples.length },
      };
    },
  },
] as const;

export default specs;
