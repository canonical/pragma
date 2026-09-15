import type { Count } from "@canonical/dataviews-core";

/** The count of a value no matching record holds. */
export const NO_RECORDS: Count = Object.freeze({ kind: "exact", value: 0 });
