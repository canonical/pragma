/**
 * Vitest global setup: one temp root for the whole RUN, allocated before any
 * worker starts and removed when the last HOLDER finishes with it.
 *
 * WHY THE ROOT IS RUN-LEVEL AND NOT PER-FILE. Per-file allocation cannot meet
 * either half of what this fix is for. A file whose every test is skipped runs
 * no `afterAll`, and a worker torn down mid-file runs no hook at all, so a
 * per-file scheme always leaves residue behind and has to reclaim it on some
 * LATER run — which means a run is never actually clean, only eventually
 * clean. And a per-file allocation fails per FILE: on a full disk every worker
 * throws while importing its test file, which is the hundred-failures-no-
 * assertions silhouette this whole change exists to abolish, reproduced by
 * the cure.
 *
 * Run-level fixes both by construction. `setup` runs in the main process,
 * before a single worker exists: a disk that cannot fit one directory fails
 * here, once, with a message that names the disk. `teardown` runs after the
 * last holder's workers exit, whatever happened inside them — skipped files,
 * thrown files, torn-down workers — so one removal reclaims the run's whole
 * footprint and the net is zero, not "zero after the next run sweeps".
 *
 * The path reaches the workers through the environment, which they inherit
 * from this process. `setupXdgIsolation.ts` reads it, takes a per-file
 * subdirectory inside it, and points `TMPDIR` there.
 *
 * WHY THE ROOT IS REFCOUNTED. `globalSetup` is a PROJECT option, and this
 * package's config defines TWO projects (a worker-reuse one and a
 * per-file-isolation one — see `vitest.config.ts`), so this file's `setup`
 * runs once per project. Two uncoordinated setups race on the one environment
 * variable: both allocate, the second write wins, and the first root is
 * orphaned inside the real system temp directory for good — one leaked root
 * per run, the exact residue class this file exists to abolish. So `setup`
 * ADOPTS the root the variable already names when it is live, and every
 * holder counts itself in a refcount file inside the root: each `setup` bumps
 * it, each `teardown` decrements it, and only the holder whose decrement
 * reaches zero removes the tree. A `--project` run holds the root once; a
 * full run holds it twice; the last holder out closes the door, whichever
 * project that is.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

/**
 * The holder count, inside the root. One file, one integer, sync I/O — the
 * setups and teardowns all run in the main vitest process, so nothing races
 * between the read and the write.
 */
const REFCOUNT_FILE = ".refcount";

/** The root this module instance holds, between {@link setup} and {@link teardown}. */
let runRoot: string | undefined;

/** Read the holder count; a missing or corrupt file counts as none. */
function readRefcount(root: string): number {
  try {
    const count = Number.parseInt(
      readFileSync(join(root, REFCOUNT_FILE), "utf-8"),
      10,
    );
    return Number.isNaN(count) ? 0 : count;
  } catch {
    return 0;
  }
}

/** Write the holder count. */
function writeRefcount(root: string, count: number): void {
  writeFileSync(join(root, REFCOUNT_FILE), `${count}\n`);
}

/**
 * Allocate a fresh run root, or fail the run with a diagnosis rather than a
 * hundred import errors.
 *
 * @throws A plain `Error` naming the disk when the temp directory cannot take
 *   one more directory.
 */
function allocateRoot(): string {
  const systemTmp = tmpdir();
  try {
    return mkdtempSync(join(systemTmp, ROOT_PREFIX));
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
}

/**
 * Take one hold on the run root: adopt the live root the environment already
 * names, or allocate one and publish it.
 *
 * @returns Nothing; the root is remembered for {@link teardown} and published
 *   on the environment when freshly allocated.
 * @note Impure — creates directories and writes `process.env`.
 */
export function setup(): void {
  const claimed = process.env[TEMP_ROOT_ENV];
  const adopt = claimed !== undefined && claimed !== "" && existsSync(claimed);
  const root = adopt ? claimed : allocateRoot();
  runRoot = root;
  // The hold is taken on BOTH paths — an adopted root is held as firmly as a
  // fresh one, so the refcount stays balanced whatever order the projects'
  // setups and teardowns run in.
  writeRefcount(root, readRefcount(root) + 1);
  if (!adopt) {
    process.env[TEMP_ROOT_ENV] = root;
  }
}

/**
 * Release this module's hold: decrement the count, and remove the root only
 * when it reaches zero — another project's workers may still be running
 * inside it.
 *
 * Tolerates failure: a removal that throws (a subprocess still holding a
 * descriptor, a fixture that made a directory read-only) must never turn a
 * green run red. One leaked root is one directory, and the message says which.
 *
 * @note Impure — writes the refcount file; removes the directory tree at zero.
 */
export function teardown(): void {
  const root = runRoot;
  if (root === undefined) return;
  runRoot = undefined;
  const remaining = readRefcount(root) - 1;
  if (remaining > 0) {
    writeRefcount(root, remaining);
    return;
  }
  try {
    rmSync(root, { recursive: true, force: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`Could not remove the test temp root ${root}: ${reason}`);
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

/**
 * The run-level SHARED pack-cache root, inside the run root.
 *
 * The pack cache is the one XDG layer files may share: its directories are
 * content-addressed and immutable (a new source set is a new hash), so two
 * files reading the same pack race nothing and observe nothing about each
 * other. Sharing it is what stops every store-booting file re-materialising
 * the multi-megabyte embedded pack into a private cache of its own —
 * `setupXdgIsolation.ts` points each file's `XDG_CACHE_HOME` here, and
 * `sharedCacheSeed.globalSetup.ts` seeds the embedded pack into it before any
 * worker starts.
 *
 * Everything a test MUTATES or asserts stays per-file: `XDG_CONFIG_HOME`,
 * `XDG_DATA_HOME` and `XDG_STATE_HOME` are re-allocated per file, and a test
 * that needs a COLD cache overrides `XDG_CACHE_HOME` itself (the precedents:
 * `entitySource.test.ts`, `safety.test.ts`, `bundledSkills.test.ts`,
 * `wasmEmbed.test.ts`).
 *
 * @returns The shared cache directory, created if this is its first caller.
 * @throws If {@link setup} did not run — the same contract as
 *   {@link requireTempRoot}.
 * @note Impure — reads `process.env`, creates a directory.
 */
export function requireSharedCacheDir(): string {
  const dir = join(requireTempRoot(), "shared-cache");
  mkdirSync(dir, { recursive: true });
  return dir;
}
