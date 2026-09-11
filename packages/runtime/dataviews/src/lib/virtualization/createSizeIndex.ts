/** The sizes of one sequence of entries, summed in logarithmic time. */
export type SizeIndex = {
  /** The size of the entry at one position. */
  readonly size: (position: number) => number;
  /** Replace the size of the entry at one position. */
  readonly set: (position: number, size: number) => void;
  /**
   * The summed size of every entry before one position: where it starts.
   * At the sequence's length, the whole: read from the same tree, so it
   * never drifts from the offsets beside it.
   */
  readonly offset: (position: number) => number;
  /**
   * The position of the entry covering one offset: the last whose start is
   * at or before it, held to the sequence. An empty sequence answers 0.
   */
  readonly at: (offset: number) => number;
};

/**
 * Index the sizes of one sequence as a Fenwick tree. Reading where an
 * entry starts, finding the entry at an offset and replacing one size each
 * cost O(log n), so neither a scroll nor a measurement walks the sequence.
 * Building costs O(n), once per sequence.
 */
export default function createSizeIndex(sizes: readonly number[]): SizeIndex {
  const count = sizes.length;
  const own = Float64Array.from(sizes);
  // tree[i] sums the `i & -i` sizes ending at position i - 1.
  const tree = new Float64Array(count + 1);
  for (let node = 1; node <= count; node += 1) {
    tree[node] += own[node - 1];
    const parent = node + (node & -node);
    if (parent <= count) {
      tree[parent] += tree[node];
    }
  }
  // The largest power of two within the tree: where a descent starts.
  let top = 1;
  while (top * 2 <= count) {
    top *= 2;
  }

  return {
    size: (position) => own[position],
    set(position, size) {
      const delta = size - own[position];
      own[position] = size;
      for (let node = position + 1; node <= count; node += node & -node) {
        tree[node] += delta;
      }
    },
    offset(position) {
      let sum = 0;
      for (let node = position; node > 0; node -= node & -node) {
        sum += tree[node];
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
        if (node <= count && tree[node] <= remaining) {
          position = node;
          remaining -= tree[node];
        }
      }
      return Math.min(position, Math.max(0, count - 1));
    },
  };
}
