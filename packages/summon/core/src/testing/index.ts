/**
 * `@canonical/summon-core/testing` — test-only helpers a CONSUMER runs.
 *
 * A separate subpath, not part of the main barrel, for two reasons: nothing on
 * a production path should be able to import a temp-directory writer by
 * accident, and the main barrel is the runtime contract while this is a testing
 * contract that may move faster.
 */

export type {
  ConformanceFixture,
  ReferenceRun,
  TreeDiff,
  TreeSnapshot,
} from "./conformance/index.js";
export {
  CONFORMANCE_FIXTURES,
  diffTrees,
  fixture,
  formatTreeDiff,
  isIdentical,
  produceReference,
  snapshotTree,
} from "./conformance/index.js";
