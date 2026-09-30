import { useEffect, useRef } from "react";
import type { TimelineSortOrder, TimelineUrlState } from "../types.js";

type UseTimelineUrlParamsProps = {
  /** Whether URL synchronisation is enabled. */
  enabled: boolean;
  /** Query-param namespace. */
  prefix?: string;
  /**
   * Called on mount and on popstate with the URL state. On "mount" the caller
   * may keep prop defaults when the URL is silent; on "popstate" the URL is
   * authoritative.
   */
  onParams?: (state: TimelineUrlState, source: "mount" | "popstate") => void;
};

const SORT_ORDERS: readonly string[] = ["newest", "oldest"];

function readParams(prefix: string): TimelineUrlState {
  if (typeof window === "undefined") {
    return { filters: {} };
  }
  const params = new URLSearchParams(window.location.search);
  const actor = params.get(`${prefix}.actor`) ?? undefined;
  const event = params.get(`${prefix}.event`) ?? undefined;
  const sort = params.get(`${prefix}.sort`) ?? undefined;
  return {
    filters: { actorId: actor, eventType: event },
    sortOrder:
      sort !== undefined && SORT_ORDERS.includes(sort)
        ? (sort as TimelineSortOrder)
        : undefined,
  };
}

/**
 * Read Timeline filters and sort order from the URL query params. Listens to
 * popstate so back/forward navigation restores the state. Writing is handled
 * separately by `writeTimelineUrlParams` on state changes.
 *
 * @note Technical debt, accepted — no location port. Reads
 * `window.location.search` and writes via `window.history` directly, so
 * a pushState-based router cannot see or intercept Timeline URL state, and
 * a router that also listens to popstate can race this hook's adoption.
 * The dataviews stack solves this with a location port (read/write/subscribe,
 * platform and memory implementations). Deferred: no router-backed Timeline
 * consumer yet, and the dataviews port is experimental with no stable shape
 * to mirror. Revisit on the first router- or server-backed consumer, or the
 * dataviews port releasing: introduce TimelineLocation here, thread an
 * optional `location` prop from Timeline down to this hook, defaulting to
 * the platform implementation so existing consumers are unaffected.
 */
export default function useTimelineUrlParams({
  enabled,
  prefix = "tl",
  onParams,
}: UseTimelineUrlParamsProps): void {
  // Latest-ref so an unstable onParams cannot re-fire the mount read.
  const onParamsRef = useRef(onParams);
  useEffect(() => {
    onParamsRef.current = onParams;
  });
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return undefined;
    }
    onParamsRef.current?.(readParams(prefix), "mount");
    const handlePopState = () => {
      onParamsRef.current?.(readParams(prefix), "popstate");
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled, prefix]);
}
