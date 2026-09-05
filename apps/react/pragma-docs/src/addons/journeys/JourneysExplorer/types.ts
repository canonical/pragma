export interface JourneysExplorerProps {
  /** Additional CSS class names. */
  className?: string;
  /** The selected job (graph URI), or undefined on `/journeys`. */
  readonly job: string | undefined;
}

/**
 * Which reading of the demand model the centre shows — the table (the
 * index) or the graph (one journey's spine). EPHEMERAL client state, never
 * the URL (P-D7); the default is a constant so the SSR first paint is fixed.
 */
export type JourneyView = "table" | "graph";

/** The default reading: the table, the lens's primary surface. A constant,
 * read from nothing — the strongest form of the SSR determinism argument. */
export const DEFAULT_JOURNEY_VIEW: JourneyView = "table";

/**
 * THE VIEW-DEPENDENT LAYOUT (RULING 2), now expressed the strict
 * intrinsic-grid way. The explorer no longer sets its own column TEMPLATE —
 * under the one-grid model it is a `grid-template-columns: subgrid` that
 * inherits the shell's intrinsic columns (see styles.css). The view switch
 * therefore changes the tenants' SPANS, not the grid template:
 *
 * - GRAPH: rail (span 2) · well (the middle) · inspector (span 3) — the
 *   graph needs the job inspector beside it.
 * - TABLE: rail (span 2) · table (the rest) — no inspector, no empty column.
 *
 * The switch is driven by `data-view` on the explorer root (already set),
 * so the stylesheet owns the span rules per view and this module carries no
 * template string at all. The DEFAULT is `table`, a constant, so the SSR
 * first paint is fixed and the client's first render matches byte for byte.
 * No inline `grid-template-columns` remains — nothing for the server and
 * client to disagree about, and the chain is never broken by a bespoke
 * template.
 */
