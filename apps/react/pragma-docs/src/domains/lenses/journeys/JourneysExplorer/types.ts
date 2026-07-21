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
