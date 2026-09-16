import type { DataViewsMessages } from "@canonical/dataviews-core";

/**
 * Every message replaced by a token naming it: `‹search›` for the search
 * input's label, and a function answering `‹selectRow›` where the record
 * words a fact. What a part renders is then the key it read, so any English
 * left on the page is a part's own rather than the record's.
 */
export default function createTokenMessages(
  english: DataViewsMessages,
): DataViewsMessages {
  return Object.fromEntries(
    Object.entries(english).map(([key, message]) => [
      key,
      typeof message === "string" ? `‹${key}›` : () => `‹${key}›`,
    ]),
  ) as unknown as DataViewsMessages;
}
