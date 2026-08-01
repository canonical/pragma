/**
 * Compare two generated trees and say precisely how they differ.
 *
 * A bare `expect(a).toEqual(b)` over two trees reports "objects differ" and
 * leaves the reader to find the byte. This returns the three ways a tree can
 * diverge — a path only one side wrote, and a path both wrote with different
 * contents — so a conformance failure names the file that broke the seam.
 */

import type { TreeSnapshot } from "./snapshotTree.js";

/** How two trees differ. Empty in all three fields means byte-identical. */
export interface TreeDiff {
  /** Paths the first tree has and the second does not. */
  readonly onlyInFirst: readonly string[];
  /** Paths the second tree has and the first does not. */
  readonly onlyInSecond: readonly string[];
  /** Paths both trees have, whose contents differ. */
  readonly differingContent: readonly string[];
}

/**
 * Diff two snapshots.
 *
 * @param first - One producer's tree.
 * @param second - The other producer's tree.
 * @returns The three divergence sets, each sorted.
 */
export function diffTrees(first: TreeSnapshot, second: TreeSnapshot): TreeDiff {
  const onlyInFirst: string[] = [];
  const differingContent: string[] = [];
  for (const [path, content] of first) {
    if (!second.has(path)) onlyInFirst.push(path);
    else if (second.get(path) !== content) differingContent.push(path);
  }
  const onlyInSecond = [...second.keys()].filter((path) => !first.has(path));
  return {
    onlyInFirst: onlyInFirst.sort(),
    onlyInSecond: onlyInSecond.sort(),
    differingContent: differingContent.sort(),
  };
}

/** Whether a diff reports no divergence at all — the conformance condition. */
export function isIdentical(diff: TreeDiff): boolean {
  return (
    diff.onlyInFirst.length === 0 &&
    diff.onlyInSecond.length === 0 &&
    diff.differingContent.length === 0
  );
}

/**
 * Render a diff as an assertion message.
 *
 * @param diff - The divergence to describe.
 * @param firstLabel - What produced the first tree (e.g. the bin's name).
 * @param secondLabel - What produced the second tree.
 * @returns A multi-line message, or the empty string when the trees match.
 */
export function formatTreeDiff(
  diff: TreeDiff,
  firstLabel: string,
  secondLabel: string,
): string {
  if (isIdentical(diff)) return "";
  const lines: string[] = [];
  if (diff.onlyInFirst.length > 0) {
    lines.push(`only ${firstLabel} wrote: ${diff.onlyInFirst.join(", ")}`);
  }
  if (diff.onlyInSecond.length > 0) {
    lines.push(`only ${secondLabel} wrote: ${diff.onlyInSecond.join(", ")}`);
  }
  if (diff.differingContent.length > 0) {
    lines.push(`contents differ: ${diff.differingContent.join(", ")}`);
  }
  return lines.join("\n");
}
