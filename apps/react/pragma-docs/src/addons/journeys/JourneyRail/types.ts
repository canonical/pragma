import type { JourneyCoordinate } from "../JourneyWell/buildJourneyGraph.js";
import type { JourneyFilter } from "../journeyFilter.js";

export interface JourneyRailProps {
  /** Additional CSS class names. */
  className?: string;
  /** EVERY coordinate the model carries — the rail is the complete index,
   * so it is handed the unfiltered set and dims rather than hides. */
  readonly coordinates: readonly JourneyCoordinate[];
  /** The lens's ephemeral filter. */
  readonly filter: JourneyFilter;
  /** The persona URIs the graph carries, for the approximate axis. */
  readonly personas: readonly string[];
  /** The selected job (prefixed URI), or undefined on `/journeys`. */
  readonly job: string | undefined;
  /** Change the filter — the rail owns the coordinate/persona choice. */
  readonly onFilterChange: (next: JourneyFilter) => void;
  /** Each coordinate's role-axis URIs, for the approximate persona match. */
  readonly rolesByCoordinate: Readonly<Record<string, readonly string[]>>;
}
