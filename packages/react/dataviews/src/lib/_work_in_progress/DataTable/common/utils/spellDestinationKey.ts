import type { ColumnChange } from "../types.js";

/**
 * The key one change to one column's destination is kept under, so the
 * table that spells the destinations and the menu that reads them name each
 * the same way.
 */
export default function spellDestinationKey(
  columnId: string,
  change: ColumnChange,
): string {
  return `${change}:${columnId}`;
}
