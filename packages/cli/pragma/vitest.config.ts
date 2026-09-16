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
    setupFiles: ["./src/testing/setupXdgIsolation.ts"],
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
      // Ratcheted to ONE POINT under the measured floor. The gate sat at 50
      // while the suite really covered ~90, so forty points of headroom meant
      // any amount of new code could arrive uncovered and CI would say
      // nothing. One point is the deliberate remainder: at the floor itself a
      // handful of uncovered lines in an unrelated change fails CI on
      // coverage rather than on a test, and a run that skips a
      // host-dependent case (the Nix snippet needs `nix-instantiate`) reads
      // as a coverage regression. These numbers move UP when a run beats
      // them; they are not a target to code down to.
      thresholds: {
        statements: 89,
        branches: 80,
        functions: 91,
        lines: 90,
      },
    },
  },
});
