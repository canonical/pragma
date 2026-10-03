import type { HistoryBehavior, LocationQuery } from "@canonical/ds-types";
import type { TimelineUrlState } from "../types.js";

export type UseTimelineUrlParamsProps = {
  /**
   * The URL's query, provided by the app's router or host. Without it nothing
   * is read or written: the state stays empty and writes do nothing.
   */
  locationQuery?: LocationQuery;
  /** Query-param namespace. Default `"tl"`. */
  prefix?: string;
  /**
   * Called when Timeline's params change from outside Timeline, such as Back,
   * Forward or a router navigation. Timeline's own writes and changes to
   * other params are not reported.
   */
  onParams?: (state: TimelineUrlState) => void;
};

export type UseTimelineUrlParamsResult = {
  /** Timeline's state as the URL currently carries it. */
  state: TimelineUrlState;
  /**
   * Write Timeline's state to the URL, keeping every other param. `history`
   * says whether the write appends an entry (`"push"`) or overwrites the
   * current one (`"replace"`). A write that changes nothing is skipped.
   */
  write: (state: TimelineUrlState, history: HistoryBehavior) => void;
};
