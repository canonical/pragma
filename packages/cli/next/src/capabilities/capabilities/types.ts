/**
 * Types for the `capabilities` orientation tool.
 *
 * The catalog is DERIVED from the live grammar (`emitSurface`) plus an authored
 * hint table — never a hand-maintained tool list — so it cannot drift from the
 * real surface (the exact failure mode of the old shell's `TOOL_CATALOG`, which
 * still named retired tools). See {@link ToolHint} + `hints.ts` for the one
 * authored input, and `catalog.ts` for the derivation.
 */

/** A tool's behavioural category, used for grouping + counts. */
export type ToolCategory = "read" | "write" | "orientation" | "diagnostic";

/** The one authored fact per tool: its category + a one-line "use when" hint. */
export interface ToolHint {
  readonly category: ToolCategory;
  readonly use_when: string;
}

/** One tool as it appears in the catalog — its live name plus its hint. */
export interface CatalogTool {
  readonly name: string;
  readonly category: ToolCategory;
  readonly use_when: string;
}

/** A single stage in the discovery flow an agent follows at session start. */
export interface DiscoveryStage {
  readonly stage: number;
  readonly tool: string;
  readonly purpose: string;
}

/** Tool counts by category (all DERIVED from the live catalog, never pinned). */
export interface ToolCounts {
  readonly total: number;
  readonly read: number;
  readonly write: number;
  readonly orientation: number;
  readonly diagnostic: number;
}

/** The structured system map returned by the `capabilities` tool. */
export interface CapabilitiesData {
  readonly version: string;
  readonly conventions: {
    readonly system: string;
    readonly model: string;
    readonly querying: string;
  };
  readonly discovery_sequence: readonly DiscoveryStage[];
  readonly tools: readonly CatalogTool[];
  readonly counts: ToolCounts;
  readonly limits: {
    readonly output_modes: readonly string[];
    readonly condensed_available: boolean;
  };
}
