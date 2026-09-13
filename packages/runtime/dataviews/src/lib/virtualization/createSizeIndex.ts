import type { SizeIndex } from "./types.js";

/**
 * Index the sizes of one sequence as a Fenwick tree. Reading where an
 * entry starts, finding the entry at an offset and replacing one size each
 * cost O(log n), so neither a scroll nor a measurement walks the sequence.
 * Building costs O(n), once per sequence.
 */
export default function createSizeIndex(sizes: readonly number[]): SizeIndex {
  const count = sizes.length;
  const own = Float64Array.from(sizes);
  // tree[i] sums the `i & -i` sizes ending at position i - 1. Every read of
  // either array below is on the hot path and its index is held within
  // the array by the loop it sits in, so the read is asserted in place
  // rather than handled: an undefined here is not a case, it is a broken
  // loop bound.
  const tree = new Float64Array(count + 1);
  for (let node = 1; node <= count; node += 1) {
    tree[node] = (tree[node] as number) + (own[node - 1] as number);
    const parent = node + (node & -node);
    if (parent <= count) {
      tree[parent] = (tree[parent] as number) + (tree[node] as number);
    }
  }
  // The largest power of two within the tree: where a descent starts.
  let top = 1;
  while (top * 2 <= count) {
    top *= 2;
  }

  return {
    // A position outside the sequence has no size: the caller asked about
    // an entry that is not there, and NaN says so where zero would lie.
    size: (position) => own[position] ?? Number.NaN,
    set(position, size) {
      // A position outside the sequence has no entry to size: nothing
      // changes, and the walk below never starts from a node before the
      // tree's root, where it would not advance.
      if (position < 0 || position >= count) {
        return;
      }
      const delta = size - (own[position] as number);
      own[position] = size;
      for (let node = position + 1; node <= count; node += node & -node) {
        tree[node] = (tree[node] as number) + delta;
      }
    },
    offset(position) {
      let sum = 0;
      for (let node = position; node > 0; node -= node & -node) {
        sum += tree[node] as number;
      }
      return sum;
    },
    at(offset) {
      // Descend from the top, taking every whole node that still ends at
      // or before the offset: what is left is the entry covering it.
      let position = 0;
      let remaining = offset;
      for (let step = top; step > 0; step >>= 1) {
        const node = position + step;
        const covered = node <= count ? (tree[node] as number) : Number.NaN;
        if (covered <= remaining) {
          position = node;
          remaining -= covered;
        }
      }
      return Math.min(position, Math.max(0, count - 1));
    },
  };
}
