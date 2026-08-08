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
 *
 * A ONE-FIELD BOX, KEPT ON PURPOSE. `Record<string, string>` would delete this
 * interface, 36 pairs of braces and 36 `use_when:` keys with every authored
 * string byte-identical, and on a lane whose bar is removal that is the obvious
 * move. It is declined because the field's FATE is an open owner decision, and
 * the collapse loses in both directions it could go: if `use_when` is ruled
 * derivable or dropped, `TOOL_HINTS` goes with it and the collapse was churn on
 * the way to a deletion; if it gains a companion authored field, the collapse
 * has to be undone first. `category` leaving this interface (20ec187) is the
 * evidence that the shape does move. It pays only in the branch where the table
 * stays exactly as it is forever, which is the one branch nobody has ruled for.
 * Collapse it once the ruling is in.
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
