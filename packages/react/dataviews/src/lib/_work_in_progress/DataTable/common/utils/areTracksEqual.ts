import {
  areListsEqual,
  areSizingsEqual,
  type ColumnToSize,
} from "@canonical/dataviews-core/bindings";

/**
 * Whether two solved track lists say the same thing. The tracks are read
 * through the layout record on every render, so this is what keeps the
 * solver from running again for an unchanged arrangement.
 */
export default function areTracksEqual(
  a: readonly ColumnToSize[],
  b: readonly ColumnToSize[],
): boolean {
  return areListsEqual(
    a,
    b,
    (track, other) =>
      track.id === other.id && areSizingsEqual(track.sizing, other.sizing),
  );
}
