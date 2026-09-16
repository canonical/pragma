import type { Count, DataViewsMessages } from "@canonical/dataviews-core";

/**
 * A count as it is shown beside the control it describes, in the root's
 * words: exact, a lower bound, or null where the source counted nothing.
 */
export default function spellCount(
  count: Count,
  messages: DataViewsMessages,
): string | null {
  return count.kind === "unknown" ? null : messages.facetCount(count);
}
