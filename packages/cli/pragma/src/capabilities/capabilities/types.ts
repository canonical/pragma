/**
 * Types for the `capabilities` orientation tool.
 *
 * The catalog is DERIVED from the live grammar (`emitSurface`) plus the guidance
 * each verb declares — never a hand-maintained tool list — so it cannot drift
 * from the real surface (the exact failure mode of the old shell's
 * `TOOL_CATALOG`, which still named retired tools). See `catalog.ts` for the
 * derivation.
 */

import type { DiscoveryStage, ToolCategory } from "../../kernel/spec/index.js";

export type { DiscoveryStage, ToolCategory };

/** One tool as it appears in the catalog — its live name plus its verb's guidance. */
export interface CatalogTool {
  readonly name: string;
  readonly category: ToolCategory;
  readonly use_when: string;
  /** One real call, as an MCP tool call; absent only if the verb declares none. */
  readonly example?: string;
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
    readonly condensed_available: boolean;
  };
}
