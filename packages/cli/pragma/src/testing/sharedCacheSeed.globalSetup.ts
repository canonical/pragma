/**
 * Vitest global setup: seed the run's shared pack cache with the embedded
 * pack, in the main process, before a single worker starts.
 *
 * WHY THE CACHE IS SHARED AT ALL. `setupXdgIsolation.ts` used to give every
 * test FILE its own `$XDG_CACHE_HOME`, and the pack cache inside it is where
 * `materializeEmbeddedPack` writes the distribution's graph: ~13 MB of
 * content-addressed files per materialisation. A per-file cache therefore
 * re-materialised the pack in every store-booting file — the 11.4 MB payload
 * module evaluated, the files written, and oxigraph loaded over 30,000
 * triples, dozens of times per run. The cache is content-addressed and
 * immutable (a new source set is a new hash), so one directory shared by the
 * whole run is sound: every reader gets the same bytes it would have written
 * itself. `requireSharedCacheDir` (in `tempRoot.globalSetup.ts`) owns that
 * directory; the run root's teardown removes it with everything else, so no
 * pack outlives its run.
 *
 * WHY THE SEED RUNS IN THE MAIN PROCESS, NOT IN A WORKER. Left to the
 * workers, the first store-booting file in each takes the cache-miss branch
 * of `materializeEmbeddedPack` — and two workers taking it CONCURRENTLY race
 * the check-then-rename at its heart: both see the directory absent, both
 * write temp copies, and the loser's `renameSync` lands on a directory the
 * winner just installed (EEXIST) — a flaky failure with no test to blame.
 * Seeding once, before any worker exists, makes every worker take the
 * warm branch, where `packIsComplete` short-circuits and no rename runs.
 * It also moves the one 11.4 MB module evaluation out of the workers
 * entirely: no worker imports `pack.generated.ts` at all, so the payload
 * costs the run once, in a process coverage does not instrument.
 *
 * WHY `XDG_CACHE_HOME` IS SET HERE. `materializeEmbeddedPack` resolves the
 * cache root from the environment at call time, so this process must point
 * at the shared directory before it runs. Workers inherit the value but do
 * not depend on the inheritance: `setupXdgIsolation.ts` re-points every
 * file's `XDG_CACHE_HOME` at the SAME shared directory, so a worker that
 * never saw this process's environment still shares the seed.
 *
 * IDEMPOTENT BY CONSTRUCTION, TWICE OVER. The second project's `setup` runs
 * this file again; `materializeEmbeddedPack` then sees a complete pack and
 * returns without importing the payload. And a watch-mode rerun allocates a
 * fresh run root, so no pack from a previous run is ever observable — a test
 * that sees a pack in its cache sees one this run built.
 *
 * THE COLD-CACHE CONTRACT. Tests that exercise the miss branch or assert on
 * an empty cache override `XDG_CACHE_HOME` themselves with a directory of
 * their own — the existing precedents do exactly that
 * (`entitySource.test.ts`, `safety.test.ts`, `bundledSkills.test.ts`,
 * `wasmEmbed.test.ts`, and `graphpack.test.ts`'s materialisation cell) — so
 * a warm shared cache changes no assertion that was checking cache
 * COLDNESS rather than pack CONTENT.
 */

import { materializeEmbeddedPack } from "../kernel/runtime/graphpack/embedded.js";
import { requireSharedCacheDir } from "./tempRoot.globalSetup.js";

/**
 * Point the main process at the run's shared pack cache and seed it.
 *
 * @note Impure — writes `process.env` and materialises the embedded pack
 *   into the shared cache (a ~13 MB write on the first call per run).
 */
export default async function setup(): Promise<void> {
  process.env.XDG_CACHE_HOME = requireSharedCacheDir();
  await materializeEmbeddedPack();
}
