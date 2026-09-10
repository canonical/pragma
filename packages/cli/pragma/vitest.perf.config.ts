import { defineConfig } from "vitest/config";

/**
 * The SERIAL perf-budget pass — deliberately split out of the default
 * (parallel, coverage-instrumented) `vitest.config.ts`.
 *
 * The budget tests (`src/testing/perf/**`) spawn the shipped entry
 * (`node dist/src/bin.js`) and time its wall-clock cost against tight ceilings
 * (budgets.ts). Run inside
 * the 65-file parallel coverage suite they measure spawn latency while ~64
 * v8-instrumented workers saturate every core, so the whole latency
 * distribution inflates 2–3× and the ceilings blow reliably — a measurement
 * competing with the load it is supposed to be independent of. No in-file
 * statistic or retry can rescue a uniformly-shifted distribution.
 *
 * So this pass runs the perf tests ALONE, serially, in a single fork, with NO
 * coverage instrumentation — the only way spawn-latency budgets measure the
 * binary rather than the test runner. The ceilings themselves are unchanged.
 *
 * NOT RUN BY CI, by owner ruling 2026-08-30, RESTATED 2026-09-10. `test` no
 * longer chains this pass, which is how `nx affected -t test` used to reach it,
 * so nothing here gates a pull request. It stays enforced for anyone who runs
 * `bun run test:perf`. The reasoning, the measurements that forced the ruling,
 * and the two questions it deliberately left open are in BUDGETS.md.
 *
 * **DO NOT PUT THIS PASS BACK ON A CI TARGET.** Verified 2026-09-10 that
 * nothing reaches it, directly or indirectly: no workflow in `.github/` names
 * `test:perf` or `vitest.perf.config`; the package's `test` script is
 * `check:packs:test && test:vitest` and `vitest.config.ts` excludes
 * `src/testing/perf/**`; `nx.json` declares no perf target and its `test`
 * default only `dependsOn: ["^build"]`; the repo has no lefthook/husky/git
 * hooks. If you are adding a job, step, target or script chain that would
 * reach this file, you are reversing an owner ruling — say so in the PR body
 * and expect it to be challenged (`AGENTS.md`, "CI workflows are global").
 * `docs/CI.md` says the same thing where a CI author will find it.
 *
 * It also needs a QUIET BOX, which CI is not and a shared dev box often is
 * not. Spawn latency here inflates 2–3× under other processes' load, and the
 * cheap tell is the `--version` control: ~35 ms median on the machine these
 * ceilings were derived on, 60–110 ms when something else is busy. A red run
 * whose control is above ~40 ms is measuring the box. See BUDGETS.md.
 */
export default defineConfig({
  test: {
    globals: true,
    include: ["src/testing/perf/**/*.test.ts"],
    setupFiles: ["./src/testing/setupXdgIsolation.ts"],
    // Emits `dist/` once if missing — the entry the budgets spawn.
    globalSetup: [
      "./src/testing/perf/globalSetup.ts",
      // Allocates the run-level temp root BEFORE any worker starts and
      // removes it after the last one exits. `setupXdgIsolation.ts` reads it.
      "./src/testing/tempRoot.globalSetup.ts",
    ],
    environment: "node",
    // A budget case must fail on its BUDGET, never on the clock. Each case
    // spawns the entry many times in one test body, so its floor is
    // `runs × per-spawn ceiling` — vitest's 5 s default is below that for two
    // of them and has been for a while, silently: the callbacks are
    // synchronous (`spawnSync`), so vitest cannot interrupt them and reports
    // whichever failure it notices first. While the ceilings were red the
    // AssertionError won that race and the timeout never surfaced; raising the
    // ceilings on 2026-09-10 made the timeout the reported failure with the
    // budget green underneath, which is a strictly less informative red.
    //
    //   __store-probe   12 runs × 850 ms  = 10 200 ms   ← the binding case
    //   __complete      30 runs × 240 ms  =  7 200 ms   (× 2 cases)
    //   --help          15 runs × 210 ms  =  3 150 ms
    //
    // 2 × the binding case ≈ 20 000 ms, so every spawn in a run could land at
    // twice its ceiling and the ASSERTION would still be what reports. That is
    // the point of the margin — it is not headroom for slowness, it is
    // headroom for the failure message to be the useful one. Whole-file
    // runtime on the reference machine is ~30 s, so this does not lengthen a
    // healthy run at all; it only changes what a sick one says.
    testTimeout: 20_000,
    // No cross-file parallelism: the perf tests run one at a time (never
    // alongside each other or coverage workers), so a wall-clock spawn
    // measurement reflects the binary, not CPU contention or scheduler noise.
    fileParallelism: false,
  },
});
