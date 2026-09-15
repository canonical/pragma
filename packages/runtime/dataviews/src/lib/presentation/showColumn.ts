import { HIDDEN_KEY } from "./constants.js";
import listStoredIds from "./listStoredIds.js";
import resolveColumnArrangement from "./resolveColumnArrangement.js";
import type { ColumnCommandConfig, PresentationPatch } from "./types.js";

/**
 * The change that shows one hidden column again, or null where the column
 * is not hidden: one the renderer does not declare, or one already shown.
 * The hidden list keeps every other id it held, except a hideable column
 * it names that the arrangement shows anyway, because the list named every
 * column: that column is shown, so it leaves the list rather than being
 * hidden by the column shown beside it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function showColumn({
  columns,
  presentation,
  id,
}: ColumnCommandConfig): PresentationPatch | null {
  const arranged = resolveColumnArrangement(columns, presentation);
  const target = arranged.find(({ column }) => column.id === id);
  if (target === undefined || !target.hidden) {
    return null;
  }
  // A hideable column the list names yet the arrangement shows is the one
  // it keeps shown when the list names every column.
  const keptShown = new Set(
    arranged
      .filter(({ column, hidden }) => !hidden && column.hideable !== false)
      .map(({ column }) => column.id),
  );
  return {
    [HIDDEN_KEY]: listStoredIds(presentation[HIDDEN_KEY]).filter(
      (stored) => stored !== id && !keptShown.has(stored),
    ),
  };
}
