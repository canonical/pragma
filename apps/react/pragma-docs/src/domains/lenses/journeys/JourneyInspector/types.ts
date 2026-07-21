import type { JourneyPairing } from "../JourneyWell/buildJourneyGraph.js";

/** The selected job, resolved against the model — everything the
 * inspector shows, already joined. */
export interface InspectedJob {
  readonly uri: string;
  readonly label: string;
  /** The job's story, rendered VERBATIM — the reader's own words. */
  readonly story: string | undefined;
  /** The job's acceptance criteria, each verbatim. */
  readonly acceptances: readonly string[];
  /** The coordinate spelled out in words (`describeCoordinate`). */
  readonly coordinate: string;
  /** Every pairing that serves this job. */
  readonly pairings: readonly JourneyPairing[];
}

export interface JourneyInspectorProps {
  /** Additional CSS class names. */
  className?: string;
  /** The selected job, or undefined on the index (`/journeys`). */
  readonly job: InspectedJob | undefined;
}
