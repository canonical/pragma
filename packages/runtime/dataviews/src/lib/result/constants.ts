import type { Count } from "./types.js";

/**
 * A count nothing claims. One value for every source and projection that
 * reports none, so an unclaimed count is never confused with zero.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export const UNKNOWN_COUNT: Count = Object.freeze({ kind: "unknown" });
