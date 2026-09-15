import type { Count } from "./types.js";

/** Whether two counts claim the same: the same kind, and the same value where they carry one. */
export default function areCountsEqual(a: Count, b: Count): boolean {
  return a.kind === "unknown" || b.kind === "unknown"
    ? a.kind === b.kind
    : a.kind === b.kind && a.value === b.value;
}
