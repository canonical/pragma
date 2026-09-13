import type { DisplayStatus, DisplayStatusPhase } from "./types.js";

/**
 * Whether each status is a settled outcome or a passing state. Keyed by
 * every status, so one added to the union is a compile error here until
 * its phase is decided: a terminal outcome is announced once, politely; a
 * transient state is silent.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export const DISPLAY_STATUS_PHASES: Readonly<
  Record<DisplayStatus["status"], DisplayStatusPhase>
> = Object.freeze({
  pending: "transient",
  regrouping: "transient",
  failed: "terminal",
  "refresh-failed": "terminal",
  stale: "terminal",
  "no-data": "terminal",
  "no-results": "terminal",
});
