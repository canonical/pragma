/**
 * Vitest global setup: one temp root for the whole RUN, allocated before any
 * worker starts and removed when the last one finishes.
 *
 * WHY THE ROOT IS RUN-LEVEL AND NOT PER-FILE. Per-file allocation cannot meet
 * either half of what this fix is for. A file whose every test is skipped runs
 * no `afterAll`, and a worker torn down mid-file runs no hook at all, so a
 * per-file scheme always leaves residue behind and has to reclaim it on some
 * LATER run — which means a run is never actually clean, only eventually
 * clean. And a per-file allocation fails per FILE: on a full disk every worker
 * throws while importing its test file, which is the hundred-failures-no-
 * assertions silhouette this whole change exists to abolish, reproduced by the
 * cure.
 *
 * Run-level fixes both by construction. `setup` runs ONCE, in the main
 * process, before a single worker exists: a disk that cannot fit one directory
 * fails here, once, with a message that names the disk. `teardown` runs after
 * the last worker exits, whatever happened inside it — skipped files, thrown
 * files, torn-down workers — so one removal reclaims the run's whole
 * footprint and the net is zero, not "zero after the next run sweeps".
 *
 * The path reaches the workers through the environment, which they inherit
 * from this process. `setupXdgIsolation.ts` reads it, takes a per-file
 * subdirectory inside it, and points `TMPDIR` there.
 */

import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The variable carrying the run root to the workers.
 *
 * Read by `setupXdgIsolation.ts`, which runs in each worker. Not a public
 * contract: both live only inside this package's test configuration.
 */
export const TEMP_ROOT_ENV = "PRAGMA_TEST_TEMP_ROOT";

/**
 * The one name every run root carries, so a human sweeping by hand — or the
 * workaround in issue #1000 — can recognise this suite's residue.
 *
 * DELIBERATELY VENDOR-FREE. Redirecting `tmpdir()` puts this name inside every
 * temp path the tests build, and some of them assert on the path text:
 * `identity.test.ts` derives a skills root under `tmpdir()` and requires it to
 * carry no distribution name, so a root called `pragma-…` fails a PROTECTED
 * cell that has nothing to do with temp directories. Keep it clear of
 * `pragma`, `canonical`, and `design-system`.
 */
const ROOT_PREFIX = "vitest-tmproot-";

/** The run root, remembered between {@link setup} and {@link teardown}. */
let runRoot: string | undefined;

/**
 * Allocate the run root, or fail the run with a diagnosis rather than a
 * hundred import errors.
 *
 * @returns Nothing; the root is published on the environment.
 * @note Impure — creates a directory and writes `process.env`.
 */
export function setup(): void {
  const systemTmp = tmpdir();
  try {
    runRoot = mkdtempSync(join(systemTmp, ROOT_PREFIX));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // The whole point of allocating here: ONE failure, named. A full disk
    // presents as a mass import failure when it is discovered per worker, and
    // that shape reads as a broken build rather than a full disk — which is
    // how the leak this file fixes cost so much diagnosis time.
    throw new Error(
      `Could not create the test temp root under ${systemTmp}.\n` +
        `This is a DISK problem, not a test failure: ${reason}\n\n` +
        `Check free space with \`df -h ${systemTmp}\`, then reclaim this ` +
        `suite's residue:\n` +
        `  find ${systemTmp} -maxdepth 1 -type d -name '${ROOT_PREFIX}*' -exec rm -rf {} +`,
    );
  }
  process.env[TEMP_ROOT_ENV] = runRoot;
}

/**
 * Remove the run root and everything any worker put inside it.
 *
 * Tolerates failure: a removal that throws (a subprocess still holding a
 * descriptor, a fixture that made a directory read-only) must never turn a
 * green run red. One leaked root is one directory, and the message says which.
 *
 * @note Impure — removes a directory tree.
 */
export function teardown(): void {
  if (runRoot === undefined) return;
  try {
    rmSync(runRoot, { recursive: true, force: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`Could not remove the test temp root ${runRoot}: ${reason}`);
  }
}

/**
 * The run root, for a worker that needs to allocate inside it.
 *
 * @returns The run root path.
 * @throws If {@link setup} did not run — a configuration error, not a
 *   transient one, so it says how to fix the config rather than degrading to
 *   a per-file root that would silently reintroduce the leak.
 * @note Impure — reads `process.env`.
 */
export function requireTempRoot(): string {
  const root = process.env[TEMP_ROOT_ENV];
  if (root === undefined || root === "") {
    throw new Error(
      `${TEMP_ROOT_ENV} is unset, so the run-level temp root was never ` +
        `allocated. Add "./src/testing/tempRoot.globalSetup.ts" to this ` +
        `config's \`globalSetup\` array.`,
    );
  }
  mkdirSync(root, { recursive: true });
  return root;
}
