/**
 * Global test setup: give every test FILE its own temp root, and isolate the
 * XDG config, data, state, and cache layers inside it.
 *
 * The layered config reader consults `$XDG_CONFIG_HOME/pragma/config.json`
 * on every read, global-first writes create it, and the project-config
 * evaluator caches compiled configs under `$XDG_STATE_HOME`. The store layer
 * writes its content-addressed pack cache under `$XDG_CACHE_HOME`. Pointing
 * all four at temp directories is what keeps tests from observing or
 * polluting the developer's real global state. Individual tests that exercise
 * XDG behaviour override these values themselves.
 *
 * WHY THE ROOT, AND WHY IT IS REMOVED. This module is registered as
 * `setupFiles`, not `globalSetup`, so vitest executes it once per test FILE —
 * over a hundred times in a full run, in a fresh process each time. Four bare
 * module-scope `mkdtempSync` calls therefore left four directories behind per
 * file and had no hook that could ever remove them: module scope outlives no
 * one, so nothing ran after the file finished. A single suite deposited
 * roughly five hundred directories per run, and the tests, helpers, and
 * spawned binaries below them deposited thousands more, until a 12 GB tmpfs
 * was exhausted. What that exhaustion looks like is the reason this docblock
 * is long: a full disk does not read as a full disk. Every worker fails while
 * IMPORTING its test file, so the suite reports a hundred-odd files failed
 * against a handful of assertions run — the exact silhouette of a broken
 * build — and each of those files still passes when run alone.
 *
 * So the root comes first and everything else is allocated under it.
 * `TMPDIR`, `TMP`, and `TEMP` are pointed at it before any other temp
 * directory exists, which puts every later `tmpdir()` consumer inside it: the
 * four XDG directories here, the `mkdtempSync` calls in the test files and
 * their helpers, and the subprocesses those tests spawn, which inherit this
 * environment. One recursive removal in `afterAll` therefore reclaims the
 * whole file's footprint, whatever created it, and a stale root left by a
 * killed run is one directory to sweep rather than a family of thousands.
 *
 * Allocate temp directories freely under `tmpdir()`; they are cleaned for
 * you. Do not reintroduce a bare module-scope `mkdtempSync` rooted at the
 * real system temp directory — it escapes this root and leaks once per test
 * file, which is how the tmpfs was exhausted the first time.
 *
 * THE ROOT'S NAME IS DELIBERATELY VENDOR-FREE. Redirecting `tmpdir()` puts
 * the root's own name inside every temp path the tests build, and some of
 * them assert on the path text: identity.test.ts derives a skills root under
 * `tmpdir()` and requires it to carry no distribution name, so a root called
 * `pragma-test-…` fails a PROTECTED cell that has nothing to do with temp
 * directories. Keep the prefix free of `pragma`, `canonical`, and
 * `design-system` (identity.test.ts's THIS_DISTRIBUTION), and prefer a name
 * that says what it is rather than who owns it.
 */

import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

/** The one name every root carries, so a sweep can recognise its own kind. */
const ROOT_PREFIX = "vitest-tmproot-";

/**
 * How long a root must sit UNTOUCHED before another run treats it as
 * abandoned. The window is bounded from both sides. It must comfortably
 * exceed the longest a LIVE root can go without being written to — every
 * temp directory a test makes lands inside its root and bumps this mtime,
 * and the per-test timeout is five seconds, so a working root is quiet for
 * seconds, never minutes — or a run in another worktree could have its
 * directories pulled out from under it. It must also stay short enough that
 * runs a few minutes apart reclaim each other's residue, which is what keeps
 * the steady state flat; a window of hours would let a day of back-to-back
 * runs pile up exactly what this file exists to prevent.
 */
const STALE_ROOT_MS = 10 * 60 * 1000;

/**
 * Reclaim roots that no `afterAll` ever removed.
 *
 * Two cases produce them, and neither has a hook that could catch it. A test
 * file whose every test is skipped runs no `afterAll` at all and its worker
 * never exits normally, so both removals below are dead for it — measured: a
 * fully-skipped file leaves exactly one root, a passing file leaves none. And
 * a run killed outright (a full disk, a cancelled agent, a closed laptop)
 * leaves whatever was in flight. Sweeping the previous run's residue on the
 * way in is what makes the steady state flat instead of slowly rising, and it
 * is cheap: one directory read plus a stat per candidate.
 *
 * Best-effort throughout. Another process may remove the same root between
 * the stat and the removal, the directory may be unreadable, and none of that
 * is worth failing a test run over.
 *
 * @param systemTmp - The REAL system temp directory, where roots live.
 * @note Impure — reads the system temp directory and removes stale roots.
 */
function sweepStaleRoots(systemTmp: string): void {
  let entries: string[];
  try {
    entries = readdirSync(systemTmp);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.startsWith(ROOT_PREFIX)) continue;
    const candidate = join(systemTmp, entry);
    try {
      if (Date.now() - statSync(candidate).mtimeMs < STALE_ROOT_MS) continue;
      rmSync(candidate, { recursive: true, force: true });
    } catch {
      // Raced by another run, or not ours to remove. Leave it.
    }
  }
}

/** The REAL system temp directory — the only `tmpdir()` read that precedes
 * the redirection below, and where every root lives. */
const systemTmp = tmpdir();

sweepStaleRoots(systemTmp);

/**
 * This test file's temp root, removed wholesale when the file finishes.
 */
const testTempRoot = mkdtempSync(join(systemTmp, ROOT_PREFIX));

// Every subsequent `tmpdir()` in this process, and in the processes it
// spawns, resolves to the root. Node reads these three names in this order.
process.env.TMPDIR = testTempRoot;
process.env.TMP = testTempRoot;
process.env.TEMP = testTempRoot;

process.env.XDG_CONFIG_HOME = mkdtempSync(join(testTempRoot, "xdg-config-"));
process.env.XDG_DATA_HOME = mkdtempSync(join(testTempRoot, "xdg-data-"));
process.env.XDG_STATE_HOME = mkdtempSync(join(testTempRoot, "xdg-state-"));
process.env.XDG_CACHE_HOME = mkdtempSync(join(testTempRoot, "xdg-cache-"));

/**
 * Remove the root, tolerating every failure.
 *
 * A removal that fails (a subprocess still holding a descriptor, a mode a
 * fixture made read-only) must never turn a green run red: one leaked root is
 * a far smaller problem than a false failure, and it is a single directory to
 * sweep. `force` already absorbs a root that is simply gone, so reaching the
 * catch means something rarer, and there is nothing useful to do about it
 * here.
 */
function removeTestTempRoot(): void {
  try {
    rmSync(testTempRoot, { recursive: true, force: true });
  } catch {
    // Deliberately swallowed; see above.
  }
}

// `afterAll` is the normal path and runs even when the file's tests threw.
afterAll(removeTestTempRoot);

// The in-process backstop, for a worker that ends without vitest running the
// hook — a file that throws while importing, a worker torn down mid-file. It
// must stay synchronous: nothing asynchronous is awaited once `exit` is
// running, which is why every removal here is `rmSync`. Removing twice is
// harmless — `force` makes the second call a no-op. It does NOT cover the
// fully-skipped file (measured: the handler never runs there, which is what
// {@link sweepStaleRoots} is for).
process.on("exit", removeTestTempRoot);
