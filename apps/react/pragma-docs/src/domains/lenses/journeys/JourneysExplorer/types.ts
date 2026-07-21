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
 * THE VIEW-DEPENDENT GRID TEMPLATE (RULING 2). The explorer grid's RIGHT
 * track is view-dependent: the graph needs the job inspector beside it, the
 * table does not. So the template is switched with the ephemeral view rather
 * than left three-wide with an empty inspector column in table mode (the
 * same dead-space class as the top band the prior fix closed).
 *
 * These live here as CONSTANTS and are applied as an inline
 * `grid-template-columns` on the explorer root — NOT in the stylesheet — so
 * the switch is a pure function of the view state with zero CSS contention,
 * and the DEFAULT (table → two tracks) renders the SAME string on the server
 * and the client. The rail's `--subnav-w` minimum and the inspector's
 * `--aside-w` minimum are CONSUMED here, never re-defined (the frame owns
 * those tokens; `frameStability.tests` counts definitions).
 *
 * - GRAPH: rail · 1fr (the graph) · inspector — three tracks.
 * - TABLE: rail · 1fr (the table) — two tracks, no empty inspector column.
 */
export const GRAPH_COLUMNS =
  "minmax(var(--subnav-w), 18rem) minmax(0, 1fr) minmax(var(--aside-w), 24rem)";
export const DEFAULT_TABLE_COLUMNS =
  "minmax(var(--subnav-w), 18rem) minmax(0, 1fr)";
