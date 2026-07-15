/**
 * Block read stories — the single declaration of `block list` and
 * `block lookup` for both surfaces.
 *
 * The story kernel compiles these into the CLI commands and MCP tools,
 * so descriptions, parameters, resolution, and rendering live here once.
 */

import { PragmaError } from "#error";
import { createListView, createLookupView } from "#tui";
import type { ColumnDef } from "../shared/contracts.js";
import {
  type LookupStory,
  type LookupStoryView,
  type ReadStory,
  requirePragmaContext,
} from "../shared/stories/index.js";
import type { BlockDetailed } from "../shared/types/index.js";
import { blockConfig } from "./blockConfig.js";
import {
  createLookupOptions,
  listFormatters,
  lookupFormatters,
} from "./formatters/index.js";
import type { BlockLookupInput } from "./formatters/types.js";
import { resolveAspects } from "./helpers/index.js";
import { listBlocks } from "./operations/index.js";
import {
  buildBlockFilters,
  resolveBlockList,
  resolveBlockLookup,
} from "./orchestration/index.js";
import type { AspectFlags, BlockListContract } from "./types.js";

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

/** The `block lookup` / `block_lookup` read story. */
export const blockLookupStory: LookupStory<BlockDetailed, BlockLookupInput> = {
  noun: "block",
  description: "Look up block details",
  toolDescription:
    "Get detailed information about one or more design system blocks including anatomy, modifiers, tokens, and applicable standards.",
  namesDescription: "Block names or IRIs",
  namesToolDescription:
    "Block names or IRIs to look up (e.g. ['Button', 'ds:global.component.card'])",
  complete: async (partial, cmdCtx) => {
    const ctx = requirePragmaContext(cmdCtx);
    const all = await listBlocks(ctx.store, ctx.config);
    const lower = partial.toLowerCase();
    // Block names recur across tiers/packages; dedupe so completion offers each
    // name once.
    const unique = new Set(
      all
        .map((block) => block.name)
        .filter((name) => name.toLowerCase().startsWith(lower)),
    );
    return [...unique];
  },
  detailedParam: {
    description:
      "Show full details including anatomy, modifiers, tokens, and implementations",
    toolDescription: "Return full details (default: true for MCP)",
  },
  params: [
    {
      name: "anatomy",
      type: "boolean",
      description: "Show anatomy tree",
      default: false,
      surfaces: "cli",
    },
    {
      name: "modifiers",
      type: "boolean",
      description: "Show modifier values",
      default: false,
      surfaces: "cli",
    },
    {
      name: "tokens",
      type: "boolean",
      description: "Show token references",
      default: false,
      surfaces: "cli",
    },
    {
      name: "implementations",
      type: "boolean",
      description: "Show implementation paths",
      default: false,
      surfaces: "cli",
    },
  ],
  parameterGroups: {
    "Aspect filters": ["anatomy", "modifiers", "tokens", "implementations"],
  },
  examples: [
    "pragma block lookup Button",
    "pragma block lookup Button Card",
    "pragma block lookup Button --detailed",
    "pragma block lookup Button --anatomy --modifiers",
    "pragma block lookup Button --detailed --llm",
    "pragma block lookup ds:global.component.button",
  ],
  resolve: async (rt, names) => {
    const contract = await resolveBlockLookup(
      rt.store,
      names,
      buildBlockFilters(rt),
    );
    return contract.result;
  },
  resolveDetailed: (surface, params) => {
    if (surface === "mcp") {
      return ((params.detailed as boolean | undefined) ?? true) === true;
    }
    return params.detailed === true || isAspectSelected(params);
  },
  toFmtInput: (block, view) => ({
    block,
    detailed: view.detailed,
    aspects: resolveViewAspects(view),
  }),
  formatters: lookupFormatters,
  project: (block) => {
    const {
      uri,
      name,
      type,
      tier,
      modifiers,
      implementations,
      nodeCount,
      tokenCount,
      summary,
    } = block;
    return {
      uri,
      name,
      type,
      tier,
      modifiers,
      implementations,
      nodeCount,
      tokenCount,
      summary,
    };
  },
  emptyNamesError: () =>
    PragmaError.invalidInput("names", "(empty)", {
      recovery: {
        message: "List available blocks.",
        cli: "pragma block list",
        mcp: { tool: "block_list" },
      },
    }),
  renderInk: (result, view) =>
    createLookupView({
      results: result.results,
      errors: result.errors,
      domain: "block",
      options: createLookupOptions(view.detailed, resolveViewAspects(view)),
    }),
};

function isAspectSelected(params: Record<string, unknown>): boolean {
  return (
    params.anatomy === true ||
    params.modifiers === true ||
    params.tokens === true ||
    params.implementations === true
  );
}

function resolveViewAspects(view: LookupStoryView): AspectFlags {
  return resolveAspects({
    anatomy: view.params.anatomy === true,
    modifiers: view.params.modifiers === true,
    tokens: view.params.tokens === true,
    implementations: view.params.implementations === true,
  });
}

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
