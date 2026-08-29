import { defineConfig } from "vitest/config";

/**
 * The SERIAL pty-journey pass — the interactive TTY journeys
 * (`src/testing/behavioral/journeys.interactiveTty.e2e.test.ts`), split out of
 * the default (parallel, coverage-instrumented) `vitest.config.ts` the same
 * way the perf budgets are, and for the same class of reason.
 *
 * Each journey spawns the shipped entry under a real pseudo-terminal
 * (`script(1)`), types keystrokes against live Ink frames, and waits on
 * wall-clock deadlines. Inside the ~65-file parallel coverage run those waits
 * compete with every other worker for the CPU (this box routinely runs under
 * heavy parallel load), which is how a spawn-driven test becomes the least
 * deterministic thing in the suite. Running the five journeys ALONE, serially,
 * in a single pass keeps the driver's generous deadlines meaningful: a timeout
 * then indicates a hung subject (exactly what H3/C3/C4 guard against), not a
 * starved runner.
 *
 * NO NEW CI JOB: `pr.yml` is shared infrastructure. This pass rides the
 * package's own `test` target (`test:vitest && test:perf && test:tty`),
 * exactly as `test:perf` already does.
 */
export default defineConfig({
  test: {
    globals: true,
    include: ["src/testing/behavioral/journeys.interactiveTty.e2e.test.ts"],
    setupFiles: ["./src/testing/setupXdgIsolation.ts"],
    globalSetup: [
      // Emits `dist/` (and rebuilds stale workspace dep dists) once if
      // missing — the entry the journeys spawn.
      "./src/testing/perf/globalSetup.ts",
      // Allocates the run-level temp root BEFORE any worker starts and
      // removes it after the last one exits. `setupXdgIsolation.ts` reads it.
      "./src/testing/tempRoot.globalSetup.ts",
    ],
    environment: "node",
    // One file, run alone: no cross-file parallelism to starve the pty waits.
    fileParallelism: false,
    // Generous per-test ceiling: the driver's own 60–90 s deadlines must be
    // the thing that fires (they carry the transcript); vitest's timeout is
    // only the backstop above them.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
