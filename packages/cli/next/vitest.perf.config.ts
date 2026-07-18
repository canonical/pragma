import { defineConfig } from "vitest/config";

/**
 * The SERIAL perf-budget pass — deliberately split out of the default
 * (parallel, coverage-instrumented) `vitest.config.ts`.
 *
 * The budget tests (`src/testing/perf/**`) spawn the compiled `dist/pragma`
 * and time its wall-clock cost against tight ceilings (budgets.ts). Run inside
 * the 65-file parallel coverage suite they measure spawn latency while ~64
 * v8-instrumented workers saturate every core, so the whole latency
 * distribution inflates 2–3× and the ceilings blow reliably — a measurement
 * competing with the load it is supposed to be independent of. No in-file
 * statistic or retry can rescue a uniformly-shifted distribution.
 *
 * So this pass runs the perf tests ALONE, serially, in a single fork, with NO
 * coverage instrumentation — the only way spawn-latency budgets measure the
 * binary rather than the test runner. The ceilings themselves are unchanged and
 * still ENFORCED here; they are simply enforced in isolation. Invoked by the
 * `test:perf` script (and chained into `test`); excluded from `test:vitest`.
 */
export default defineConfig({
  test: {
    globals: true,
    include: ["src/testing/perf/**/*.test.ts"],
    setupFiles: ["./src/testing/setupXdgIsolation.ts"],
    // Builds dist/pragma once if missing — the binary the budgets spawn.
    globalSetup: ["./src/testing/perf/globalSetup.ts"],
    environment: "node",
    // No cross-file parallelism: the perf tests run one at a time (never
    // alongside each other or coverage workers), so a wall-clock spawn
    // measurement reflects the binary, not CPU contention or scheduler noise.
    fileParallelism: false,
  },
});
