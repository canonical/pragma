import type { ColumnDef } from "../../domains/shared/contracts.js";
import { COL_GAP, MIN_COL_WIDTH } from "../constants.js";

const FIRST_COL_MIN_RATIO = 0.3;

/**
 * Compute proportional column widths based on content and terminal width.
 *
 * Measures the maximum content width for each column across all items,
 * then distributes the available terminal width proportionally. The first
 * column (typically Name) receives at least 30% of the available width
 * to ensure readability.
 *
 * @param columns - Visible column definitions.
 * @param items - Data items to measure content widths against.
 * @param terminalWidth - Available width in characters.
 * @returns Array of computed widths (one per column).
 */
export default function computeWidths<T>(
  columns: readonly ColumnDef<T>[],
  items: readonly T[],
  terminalWidth: number,
): readonly number[] {
  if (columns.length === 0) return [];

  const totalGaps = (columns.length - 1) * COL_GAP;
  const available = terminalWidth - totalGaps - 1;

  const naturalWidths = columns.map((col) => {
    const labelWidth = col.label.length;
    const maxContent = items.reduce((max, item) => {
      const raw = item[col.key];
      const formatted = col.format ? col.format(raw) : String(raw ?? "");
      return Math.max(max, formatted.length);
    }, 0);
    return Math.max(labelWidth, maxContent);
  });

  const totalNatural = naturalWidths.reduce((sum, w) => sum + w, 0);

  if (totalNatural <= available) {
    return naturalWidths;
  }

  const firstColMin = Math.floor(available * FIRST_COL_MIN_RATIO);
  return naturalWidths.map((natural, i) => {
    const ratio =
      totalNatural > 0 ? natural / totalNatural : 1 / columns.length;
    const proportional = Math.floor(available * ratio);
    if (i === 0) return Math.max(proportional, firstColMin);
    return Math.max(proportional, MIN_COL_WIDTH);
  });
}
