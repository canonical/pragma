/**
 * `block list` — the ONE hand-written read (Risk5).
 *
 * A block list is config-filtered in ways packs cannot express declaratively:
 * the tier CHAIN (a tier makes its whole parent chain visible), the channel
 * (release-level visibility), and the `--all-tiers` escape. Everything else in
 * PR3 is a declarative pack; this verb ports that behaviour directly. It reads
 * the effective tier/channel from config and runs one generated SELECT (no user
 * input in the query — the tier is config, the channel a closed enum).
 */

import { runSelect } from "../../kernel/packs/sparql/runSelect.js";
import type {
  ColumnDef,
  RenderListOptions,
} from "../../kernel/render/contracts.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import {
  renderListLlm,
  renderListPlain,
} from "../../kernel/render/renderers.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { Formatters, VerbSpec } from "../../kernel/spec/types.js";
import { buildChannelFilter, buildTierFilter } from "./tierChain.js";

/** One block summary row. */
export interface BlockRow {
  readonly uri: string;
  readonly name: string;
  readonly type: string;
  readonly tier: string;
  readonly modifiers: string;
}

/** Local name of an IRI (`…/global` → `global`; `…#Thing` → `Thing`). */
function localName(uri: string): string {
  const hash = uri.lastIndexOf("#");
  if (hash !== -1) return uri.slice(hash + 1);
  const slash = uri.lastIndexOf("/");
  return slash !== -1 ? uri.slice(slash + 1) : uri;
}

/** Normalize a block's rdf:type to one of the four block kinds. */
function normalizeType(typeUri: string | undefined): BlockRow["type"] {
  const local = localName(typeUri ?? "").toLowerCase();
  return local === "pattern" || local === "layout" || local === "subcomponent"
    ? local
    : "component";
}

const listColumns: ColumnDef<BlockRow>[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "tier", label: "Tier" },
  { key: "modifiers", label: "Modifiers", showWhenEmpty: false },
  { key: "uri", label: "IRI" },
];

const listOptions: RenderListOptions<BlockRow> = {
  heading: "Blocks",
  columns: listColumns,
  prefixes: DEFAULT_PREFIX_MAP,
  // Zero blocks is a calm success (exit 0), not an error — the list is scoped by
  // the active tier chain and channel, so the message names that scope and the
  // hint offers the escape hatches (a cold store fails earlier with
  // STORE_UNAVAILABLE, so reaching here means the store is built).
  emptyMessage: "No blocks found under the current tier and channel.",
  emptyHint:
    "Use --all-tiers to ignore the tier filter, or run `pragma sources update` if the store is empty.",
};

const listFormatters: Formatters<BlockRow[]> = {
  plain: (rows) => renderListPlain(rows, listOptions),
  llm: (rows) => renderListLlm(rows, listOptions),
  json: (rows) => JSON.stringify(rows, null, 2),
};

/** Build the config-filtered block SELECT for the resolved tier/channel. */
function buildQuery(
  tier: string | undefined,
  channel: import("../../kernel/config/types.js").Channel,
  allTiers: boolean,
): string {
  const tierFilter = allTiers ? "" : buildTierFilter(tier);
  const channelFilter = buildChannelFilter(channel);
  return [
    "SELECT ?component ?type ?name ?tier",
    '       (GROUP_CONCAT(DISTINCT ?modName; separator=", ") AS ?modifiers)',
    "WHERE {",
    "  VALUES ?type { ds:Component ds:Pattern ds:Layout ds:Subcomponent }",
    "  ?component a ?type ;",
    "             ds:name ?name ;",
    "             ds:tier ?tier .",
    tierFilter ? `  ${tierFilter}` : "",
    `  ${channelFilter}`,
    "  OPTIONAL { ?component ds:hasModifierFamily ?mod . ?mod ds:name ?modName }",
    "}",
    "GROUP BY ?component ?type ?name ?tier",
    "ORDER BY ?name",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

const listVerb: VerbSpec<Record<string, unknown>, BlockRow[]> = {
  path: ["block", "list"],
  summary: "List blocks visible under the current tier and channel.",
  doc: "List design system blocks visible under the active tier chain and channel. Optionally list across every tier, ignoring the tier filter.",
  params: [
    {
      kind: "boolean",
      name: "allTiers",
      doc: "Show blocks from all tiers, ignoring the tier filter.",
    },
  ],
  output: { formatters: listFormatters },
  examples: [
    { cmd: "pragma block list" },
    { cmd: "pragma block list --all-tiers" },
    { cmd: "pragma block list --llm" },
  ],
  capability: {
    needsStore: true,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: async (params: Record<string, unknown>, rt: PragmaRuntime) => {
    const layers = await rt.loadConfig();
    const query = buildQuery(
      layers.config.tier,
      layers.config.channel,
      params.allTiers === true,
    );
    const rows = await runSelect(rt, query, "block");
    return rows.map((row) => ({
      uri: row.component ?? "",
      name: row.name ?? "",
      type: normalizeType(row.type),
      tier: localName(row.tier ?? ""),
      modifiers: row.modifiers ?? "",
    }));
  },
};

/** The hand-written `block list` verb. */
export const blockListVerb = asVerb(listVerb);
