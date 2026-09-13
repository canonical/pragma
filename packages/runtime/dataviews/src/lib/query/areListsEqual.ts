/**
 * Whether two lists are equal element by element. The lengths are compared
 * first, so the parallel read is in range and asserted in place rather
 * than handled: an undefined there is not a case, it is a broken length.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function areListsEqual<T>(
  a: readonly T[],
  b: readonly T[],
  equals: (left: T, right: T) => boolean,
): boolean {
  return (
    a.length === b.length &&
    a.every((left, index) => equals(left, b[index] as T))
  );
}
