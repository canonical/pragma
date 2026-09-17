import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    // The perf-budget TIMING tests (src/testing/perf/**) are isolated into their
    // own SERIAL pass (vitest.perf.config.ts / the `test:perf` script): spawning +
    // timing the shipped entry inside this parallel, coverage-instrumented run
    // measures CPU contention, not the binary, so the ceilings flake red. They
    // stay ENFORCED, just out of this pass.
    exclude: [...configDefaults.exclude, "src/testing/perf/**"],
    // safety.test.ts's storeless-guarantee guards spawn the shipped entry
    // — a correctness check (exit/stdout), not a timing one, so it belongs in
    // this pass. Reuse the perf suite's "emit once if missing"
    // globalSetup so a clean `test:vitest` provisions it instead of failing with
    // a null exit status (the emit was previously assumed pre-built here).
    globalSetup: [
      "./src/testing/perf/globalSetup.ts",
      // Allocates the run-level temp root BEFORE any worker starts and
      // removes it after the last one exits. `setupXdgIsolation.ts` reads it.
      "./src/testing/tempRoot.globalSetup.ts",
    ],
    setupFiles: [
      "./src/testing/setupXdgIsolation.ts",
      "./src/testing/setupCallChecking.ts",
    ],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/*.test.ts",
        "**/*.d.ts",
        "**/types.ts",
        "**/bin.ts",
        "src/testing/**",
      ],
      // Ratcheted to the measured floor, rounded down. The gate sat at 50
      // while the suite really covered ~90, so forty points of headroom meant
      // any amount of new code could arrive uncovered and CI would say
      // nothing. These numbers move UP when a run beats them; they are not a
      // target to code down to.
      thresholds: {
        statements: 90,
        branches: 81,
        functions: 92,
        lines: 91,
      },
    },
  },
});
