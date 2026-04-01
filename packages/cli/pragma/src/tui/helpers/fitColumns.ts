import type { ColumnDef } from "../../domains/shared/contracts.js";
import { COL_GAP, MIN_COL_WIDTH } from "../constants.js";

const MIN_VISIBLE = 3;

/**
 * Determine which columns are visible given the available terminal width.
 *
 * Columns are ordered by priority (first = highest). When the terminal
 * is too narrow to fit all columns with minimum widths, columns are
 * dropped right-to-left (lowest priority first). At least three columns
 * are always retained, and the function never returns an empty array
 * if the input is non-empty.
 *
 * @param columns - Ordered column definitions (priority order).
 * @param terminalWidth - Available width in characters.
 * @returns The subset of columns that fit within the terminal width.
 */
export default function fitColumns<T>(
  columns: readonly ColumnDef<T>[],
  terminalWidth: number,
): readonly ColumnDef<T>[] {
  const visible = [...columns];

  while (visible.length > MIN_VISIBLE) {
    const requiredWidth =
      visible.length * MIN_COL_WIDTH + (visible.length - 1) * COL_GAP;
    if (requiredWidth <= terminalWidth) break;
    visible.pop();
  }

  return visible;
}
