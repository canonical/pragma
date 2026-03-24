/**
 * Wires the `pragma block list` CLI command.
 *
 * Lists all blocks visible under the current tier and channel filters.
 * Supports progressive disclosure via `--digest` and `--detailed` flags,
 * and an `--all-tiers` flag to widen the search.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import type {
  BlockDetailed,
  BlockSummary,
  Disclosure,
  FilterConfig,
} from "../../shared/types.js";
import { listFormatters } from "../formatters/index.js";
import { listBlocks, lookupBlock } from "../operations/index.js";

export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["block", "list"],
    description: "List blocks in the design system",
    parameters: [
      {
        name: "allTiers",
        description: "Show blocks from all tiers",
        type: "boolean",
        default: false,
      },
      {
        name: "digest",
        description: "Show enriched summary with implementations",
        type: "boolean",
        default: false,
      },
      {
        name: "detailed",
        description: "Show full details for each block",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma block list",
        "pragma block list --all-tiers",
        "pragma block list --digest",
        "pragma block list --detailed",
        "pragma block list --llm",
        "pragma block list --format json",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const allTiers = params.allTiers === true;
      const filters: FilterConfig = allTiers
        ? { tier: undefined, channel: ctx.config.channel }
        : ctx.config;

      const disclosure: Disclosure = params.detailed
        ? { level: "detailed" }
        : params.digest
          ? { level: "digest" }
          : { level: "summary" };

      const components = await listBlocks(ctx.store, filters);

      if (components.length === 0) {
        throw PragmaError.emptyResults("block", {
          filters: describeFilters(filters),
          recovery: allTiers
            ? undefined
            : {
                message: "Widen the search to show all tiers.",
                cli: "pragma block list --all-tiers",
                mcp: { tool: "block_list", params: { allTiers: true } },
              },
        });
      }

      if (disclosure.level === "summary") {
        return createOutputResult(components, {
          plain: selectFormatter(ctx, listFormatters),
        });
      }

      // Digest or detailed: enrich each block via lookupBlock
      const enriched = await enrichBlocks(
        components,
        ctx.store,
        filters,
        disclosure,
      );

      return createOutputResult(enriched, {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}

function describeFilters(filters: FilterConfig): Record<string, string> {
  const result: Record<string, string> = {};
  if (filters.tier) result.tier = filters.tier;
  result.channel = filters.channel;
  return result;
}

/**
 * Enrich block summaries with detail from lookupBlock.
 *
 * - digest: summary fields + implementations detail
 * - detailed: full BlockDetailed objects
 */
async function enrichBlocks(
  summaries: readonly BlockSummary[],
  store: Parameters<typeof lookupBlock>[0],
  filters: FilterConfig,
  disclosure: Disclosure,
): Promise<(BlockSummary | BlockDetailed)[]> {
  const details = await Promise.all(
    summaries.map((s) => lookupBlock(store, s.name, filters)),
  );

  if (disclosure.level === "detailed") {
    return details;
  }

  // digest: summary + implementations detail
  return details.map((d) => ({
    uri: d.uri,
    name: d.name,
    type: d.type,
    tier: d.tier,
    summary: d.summary,
    modifiers: d.modifiers,
    implementations: d.implementations,
    nodeCount: d.nodeCount,
    tokenCount: d.tokenCount,
    implementationPaths: d.implementationPaths,
  }));
}
