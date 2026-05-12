/**
 * Pick `count` random items from an array without replacement.
 *
 * Uses Fisher-Yates partial shuffle for uniform distribution.
 * Returns at most `arr.length` items if count exceeds the array size.
 */
export default function pickRandom<T>(
  arr: readonly T[],
  count: number,
): readonly T[] {
  const n = Math.min(count, arr.length);
  if (n === 0) return [];

  const copy = [...arr];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    const tmp = copy[i];
    copy[i] = copy[j] as T;
    copy[j] = tmp as T;
  }
  return copy.slice(0, n);
}
