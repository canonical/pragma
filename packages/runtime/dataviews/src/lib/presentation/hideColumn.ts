import { HIDDEN_KEY } from "./constants.js";
import listStoredIds from "./listStoredIds.js";
import resolveColumnArrangement from "./resolveColumnArrangement.js";
import type { ColumnCommandConfig, PresentationPatch } from "./types.js";

/**
 * The change that hides one column, or null where it cannot be hidden: a
 * column the renderer does not declare, one already hidden, one declared
 * `hideable: false`, or the last column shown, since at least one column
 * always shows. The hidden list keeps every id it held, those of columns
 * another table declares included, and adds this one last.
 *
 * Hiding is presentation: the change is written to the arrangement, and
 * nothing the source is asked for moves.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function hideColumn({
  columns,
  presentation,
  id,
}: ColumnCommandConfig): PresentationPatch | null {
  const arranged = resolveColumnArrangement(columns, presentation);
  const target = arranged.find(({ column }) => column.id === id);
  const shown = arranged.filter(({ hidden }) => !hidden).length;
  if (
    target === undefined ||
    target.hidden ||
    target.column.hideable === false ||
    shown <= 1
  ) {
    return null;
  }
  return {
    [HIDDEN_KEY]: [
      ...listStoredIds(presentation[HIDDEN_KEY]).filter(
        (stored) => stored !== id,
      ),
      id,
    ],
  };
}
