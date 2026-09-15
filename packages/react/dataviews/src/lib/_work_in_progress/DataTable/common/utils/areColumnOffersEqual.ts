import type { ColumnOffers } from "../types.js";

/** Whether two columns take the same changes, change by change. */
export default function areColumnOffersEqual(
  a: ColumnOffers,
  b: ColumnOffers,
): boolean {
  return (
    a.hide === b.hide &&
    a.show === b.show &&
    a["move-left"] === b["move-left"] &&
    a["move-right"] === b["move-right"]
  );
}
