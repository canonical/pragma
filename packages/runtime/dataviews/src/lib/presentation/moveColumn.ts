import { ORDER_KEY } from "./constants.js";
import listStoredIds from "./listStoredIds.js";
import resolveColumnArrangement from "./resolveColumnArrangement.js";
import type { MoveColumnConfig, PresentationPatch } from "./types.js";

/**
 * The change that moves one shown column past the shown column beside it,
 * or null where it cannot move that way: a column the renderer does not
 * declare, a hidden one, or the first shown column moved back or the last
 * moved on. Hidden columns keep their places: a move steps over them, so
 * every move changes what a reader sees.
 *
 * The order written keeps every id the stored order held where it stood:
 * the declared columns take the stored places of declared columns in their
 * new order, and those the stored order does not name follow. The ids of
 * columns the renderer does not declare stay in place, so another table
 * over the same presentation keeps its own order.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function moveColumn({
  columns,
  presentation,
  id,
  offset,
}: MoveColumnConfig): PresentationPatch | null {
  const arranged = resolveColumnArrangement(columns, presentation);
  const shown = arranged
    .filter(({ hidden }) => !hidden)
    .map(({ column }) => column.id);
  const from = shown.indexOf(id);
  const to = from + offset;
  // `at` counts back from the end for a negative position, which is no
  // neighbour here.
  const neighbour = from === -1 || to < 0 ? undefined : shown.at(to);
  if (neighbour === undefined) {
    return null;
  }
  const others = arranged
    .map(({ column }) => column.id)
    .filter((other) => other !== id);
  const order = others.toSpliced(
    others.indexOf(neighbour) + (offset === 1 ? 1 : 0),
    0,
    id,
  );
  const declared = new Set(order);
  // Each stored place of a declared column takes the next declared column
  // in the new order; every other stored id keeps its place.
  const merged: string[] = [];
  let taken = 0;
  for (const stored of listStoredIds(presentation[ORDER_KEY])) {
    if (declared.has(stored)) {
      // A slice rather than `at`: every declared id stored has its place in
      // the new order, so an absent one is impossible, and a guard for it
      // would be a branch no input reaches.
      merged.push(...order.slice(taken, taken + 1));
      taken += 1;
    } else {
      merged.push(stored);
    }
  }
  return { [ORDER_KEY]: [...merged, ...order.slice(taken)] };
}
