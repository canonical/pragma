import type { TimelineUrlState, TimelineUrlWriteMode } from "../types.js";

/**
 * Write Timeline filters and sort order to the URL. The default `"replace"`
 * mode rewrites the current history entry; `"push"` adds one, so back and
 * forward restore earlier filter and sort states.
 *
 * @note Technical debt, accepted — no location port. Reads
 * `window.location.search` and writes via `window.history` directly, so
 * a pushState-based router cannot see or intercept Timeline URL state, and
 * a router that also listens to popstate can race the hook's adoption.
 * The dataviews stack solves this with a location port (read/write/
 * subscribe, platform and memory implementations). Deferred: no
 * router-backed Timeline consumer yet, and the dataviews port is
 * experimental with no stable shape to mirror. Revisit on the first
 * router- or server-backed consumer, or the dataviews port releasing:
 * introduce TimelineLocation beside this writer and the hook, thread an
 * optional `location` prop from Timeline down to them, defaulting to the
 * platform implementation so existing consumers are unaffected.
 */
export default function writeTimelineUrlParams(
  prefix: string,
  state: TimelineUrlState,
  mode: TimelineUrlWriteMode = "replace",
): void {
  if (typeof window === "undefined") {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const setOrDelete = (key: string, value: string | undefined) => {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  };
  setOrDelete(`${prefix}.actor`, state.filters.actorId);
  setOrDelete(`${prefix}.event`, state.filters.eventType);
  setOrDelete(`${prefix}.sort`, state.sortOrder);
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  // Seam for future debt resolution: this direct history call is what a
  // TimelineLocation port would replace — the only line a router seam needs.
  if (mode === "push") {
    window.history.pushState(window.history.state, "", url);
  } else {
    window.history.replaceState(window.history.state, "", url);
  }
}
