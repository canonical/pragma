/**
 * Per-file test setup: give every test FILE its own directory inside the run's
 * temp root, and isolate the XDG config, data, state, and cache layers in it.
 *
 * The layered config reader consults `$XDG_CONFIG_HOME/pragma/config.json` on
 * every read, global-first writes create it, and the project-config evaluator
 * caches compiled configs under `$XDG_STATE_HOME`. The store layer writes its
 * content-addressed pack cache under `$XDG_CACHE_HOME`. Pointing all four at
 * temp directories is what keeps tests from observing or polluting the
 * developer's real global state. Individual tests that exercise XDG behaviour
 * override these values themselves.
 *
 * WHY EVERY TEMP PATH IS REDIRECTED, NOT JUST THE FOUR. This module is
 * registered as `setupFiles`, not `globalSetup`, so vitest executes it once per
 * test FILE — over a hundred times in a full run, in a fresh process each time.
 * Four bare module-scope `mkdtempSync` calls therefore left four directories
 * behind per file with no hook that could ever remove them, and the tests,
 * helpers and spawned binaries below them left thousands more, until a 12 GB
 * tmpfs was exhausted. What that exhaustion looks like is why this docblock is
 * long: a full disk does not read as a full disk. Every worker fails while
 * IMPORTING its test file, so the suite reports a hundred-odd files failed
 * against a handful of assertions run — the exact silhouette of a broken build
 * — and each of those files still passes when run alone.
 *
 * So `TMPDIR`, `TMP`, and `TEMP` are pointed at this file's directory before
 * any other temp directory exists, which puts every later `tmpdir()` consumer
 * inside it: the four XDG directories here, the `mkdtempSync` calls in the test
 * files and their helpers, and the subprocesses those tests spawn, which
 * inherit this environment. 41 of the 82 files that call `mkdtempSync` have no
 * `rmSync` anywhere in them; none of them needed editing.
 *
 * Allocate temp directories freely under `tmpdir()`; they are cleaned for you.
 * Do not reintroduce a bare `mkdtempSync` rooted at the REAL system temp
 * directory (`os.tmpdir()` read before this file runs, or an absolute `/tmp`) —
 * it escapes the run root and leaks, which is how the tmpfs was exhausted the
 * first time.
 *
 * CORRECTNESS LIVES IN THE RUN ROOT, NOT IN THIS FILE'S HOOK. The `afterAll`
 * below is hygiene: it keeps a long run's peak disk usage flat instead of
 * letting every finished file's footprint sit until the end. It is not what
 * makes the run clean. A fully-skipped file runs no `afterAll` at all, and a
 * worker torn down mid-file runs no hook either, so anything that depended on
 * this hook would still leak on exactly the cases hardest to notice. What makes
 * the run clean is `tempRoot.globalSetup.ts`'s teardown, which removes the run
 * root wholesale after the last worker exits — every file's directory, skipped
 * or not, hook or no hook.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll } from "vitest";
import { requireTempRoot } from "./tempRoot.globalSetup.js";

/**
 * This test file's directory inside the run root.
 *
 * Allocated before the redirection below, so it lands in the run root rather
 * than inside itself.
 */
const fileTempDir = mkdtempSync(join(requireTempRoot(), "file-"));

// Every subsequent `tmpdir()` in this process, and in the processes it spawns,
// resolves here. Node reads these three names in this order.
process.env.TMPDIR = fileTempDir;
process.env.TMP = fileTempDir;
process.env.TEMP = fileTempDir;

process.env.XDG_CONFIG_HOME = mkdtempSync(join(fileTempDir, "xdg-config-"));
process.env.XDG_DATA_HOME = mkdtempSync(join(fileTempDir, "xdg-data-"));
process.env.XDG_STATE_HOME = mkdtempSync(join(fileTempDir, "xdg-state-"));
process.env.XDG_CACHE_HOME = mkdtempSync(join(fileTempDir, "xdg-cache-"));

/**
 * Release this file's footprint early, tolerating every failure.
 *
 * A removal that fails (a subprocess still holding a descriptor, a mode a
 * fixture made read-only) must never turn a green run red — the run root's
 * teardown collects whatever is left regardless, so there is nothing useful to
 * do here but continue.
 */
afterAll(() => {
  try {
    rmSync(fileTempDir, { recursive: true, force: true });
  } catch {
    // Deliberately swallowed; the run teardown is the backstop. See above.
  }
});
