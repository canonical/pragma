/**
 * Block read stories — the single declaration of `block list` for both
 * surfaces.
 *
 * `block lookup` is served by the bundled `block` story pack over the
 * GraphQL fetch path (see `shared/stories/pack/bundled/blockPack.ts`); the
 * config-filtered list deliberately stays built-in (tier chain, channel,
 * --all-tiers, digest/detailed enrichment are not declarative yet).
 */

import { createListView } from "#tui";
import type { ColumnDef } from "../shared/contracts.js";
import type { ReadStory } from "../shared/stories/index.js";
import { blockConfig } from "./blockConfig.js";
import { listFormatters } from "./formatters/index.js";
import { resolveBlockList } from "./orchestration/index.js";
import type { BlockListContract } from "./types.js";

type BlockListItems = BlockListContract["result"]["items"];

const LIST_COLUMN_ORDER = ["name", "type", "tier", "modifiers", "uri"] as const;

/** The `block list` / `block_list` read story. */
export const blockListStory: ReadStory<BlockListContract, BlockListItems> = {
  noun: "block",
  verb: "list",
  description: "List blocks in the design system",
  toolDescription:
    "List design system blocks visible under current tier and channel configuration.",
  params: [
    {
      name: "allTiers",
      type: "boolean",
      description: "Show blocks from all tiers",
      toolDescription: "Show blocks from all tiers, ignoring tier filter",
      default: false,
    },
    {
      name: "digest",
      type: "boolean",
      description: "Show enriched summary with implementations",
      toolDescription: "Include implementations per block",
      default: false,
    },
    {
      name: "detailed",
      type: "boolean",
      description: "Show full details for each block",
      toolDescription: "Include full details per block",
      default: false,
    },
  ],
  examples: [
    "pragma block list",
    "pragma block list --all-tiers",
    "pragma block list --digest",
    "pragma block list --detailed",
    "pragma block list --llm",
    "pragma block list --format json",
  ],
  resolve: (rt, params) =>
    resolveBlockList(rt, {
      allTiers: params.allTiers === true,
      digest: params.digest === true,
      detailed: params.detailed === true,
    }),
  toOutput: (contract) => contract.result.items,
  formatters: listFormatters,
  toEnvelope: (contract) => {
    const { items, disclosure, filters } = contract.result;
    if (disclosure.level === "summary") {
      return { data: items, meta: { count: items.length, filters } };
    }
    return {
      data: items,
      meta: { count: items.length, disclosure: disclosure.level, filters },
    };
  },
  renderInk: (items) =>
    createListView({
      heading: "Blocks",
      domain: "block",
      items,
      columns: reorderColumns(blockConfig.listColumns, LIST_COLUMN_ORDER),
    }),
};

function reorderColumns<T>(
  columns: readonly ColumnDef<T>[],
  order: readonly string[],
): readonly ColumnDef<T>[] {
  const byKey = new Map(columns.map((col) => [col.key, col]));
  return order.flatMap((key) => {
    const col = byKey.get(key as keyof T & string);
    return col ? [col] : [];
  });
}
