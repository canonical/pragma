/**
 * The byte-equality conformance suite: the seam's definition, plus the tools to
 * assert against it.
 *
 * Both binaries generate the same trees from the same generators. That was a
 * guarantee asserted inside ONE bin's test file, which meant the other bin
 * could drift with nothing to catch it. Here it is a named suite that either
 * bin runs: {@link produceReference} IS the definition (summon-core `execute` +
 * `autoPrompt` + `runGeneratorTask` + the shared stamp), {@link snapshotTree}
 * and {@link diffTrees} make "the same tree" a value comparison with a legible
 * failure, and {@link CONFORMANCE_FIXTURES} keeps the answer sets in one place.
 */

export type { TreeDiff } from "./diffTrees.js";
export { diffTrees, formatTreeDiff, isIdentical } from "./diffTrees.js";
export type { ConformanceFixture } from "./fixtures.js";
export { CONFORMANCE_FIXTURES, fixture } from "./fixtures.js";
export type { ReferenceRun } from "./produceReference.js";
export { produceReference } from "./produceReference.js";
export type { TreeSnapshot } from "./snapshotTree.js";
export { snapshotTree } from "./snapshotTree.js";
