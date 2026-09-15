import type { ColumnSetting } from "../types.js";
import areColumnOffersEqual from "./areColumnOffersEqual.js";

/**
 * Whether two lists of column settings say the same thing: the same columns
 * in the same order, each hidden or shown alike and taking the same
 * changes. A width changes none of it, so a resize leaves the list — and
 * every column's offers the menus hold — at one reference.
 */
export default function areColumnSettingsEqual(
  a: readonly ColumnSetting[],
  b: readonly ColumnSetting[],
): boolean {
  return (
    a.length === b.length &&
    a.every((setting, at) => {
      const other = b.at(at);
      return (
        other !== undefined &&
        setting.column === other.column &&
        setting.hidden === other.hidden &&
        areColumnOffersEqual(setting.offers, other.offers)
      );
    })
  );
}
