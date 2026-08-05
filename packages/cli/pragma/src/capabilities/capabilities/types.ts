/**
 * Types for the `capabilities` orientation tool.
 *
 * The catalog is DERIVED from the live grammar (`emitSurface`) plus an authored
 * hint table — never a hand-maintained tool list — so it cannot drift from the
 * real surface (the failure mode of a hand-maintained tool catalog, which
 * still named retired tools). See {@link ToolHint} + `hints.ts` for the one
 * authored input, and `catalog.ts` for the derivation.
 */

import type { DiscoveryStage } from "../../kernel/spec/types.js";

/** A tool's behavioural category, used for grouping + counts. */
export type ToolCategory = "read" | "write" | "orientation" | "diagnostic";

/**
 * The one authored fact per tool: a one-line "use when" hint.
 *
 * It carried `category` too until that was found to be derivable — see
 * `hints.ts` and `catalog.ts#CATEGORY_BY_KERNEL_TOOL`.
 */
export interface ToolHint {
  readonly use_when: string;
}

/** One tool as it appears in the catalog — its live name plus its hint. */
export interface CatalogTool {
  readonly name: string;
  readonly category: ToolCategory;
  readonly use_when: string;
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
    /** The plan-first/confirm gate every mutating tool follows (D2). */
    readonly mutations: string;
  };
  readonly discovery_sequence: readonly DiscoveryStage[];
  readonly tools: readonly CatalogTool[];
  readonly counts: ToolCounts;
  readonly limits: {
    readonly output_modes: readonly string[];
  };
}
