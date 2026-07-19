import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    // The perf-budget TIMING tests (src/testing/perf/**) are isolated into their
    // own SERIAL pass (vitest.perf.config.ts / the `test:perf` script): spawning +
    // timing the compiled binary inside this parallel, coverage-instrumented run
    // measures CPU contention, not the binary, so the ceilings flake red. They
    // stay ENFORCED, just out of this pass.
    exclude: [...configDefaults.exclude, "src/testing/perf/**"],
    // safety.test.ts's storeless-guarantee guards spawn the compiled dist/pragma
    // — a correctness check (exit/stdout), not a timing one, so it belongs in
    // this pass. Reuse the perf suite's "build the binary once if missing"
    // globalSetup so a clean `test:vitest` provisions it instead of failing with
    // a null exit status (the binary was previously assumed pre-built here).
    globalSetup: ["./src/testing/perf/globalSetup.ts"],
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
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },
  },
});
