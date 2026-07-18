import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    // The perf-budget tests (src/testing/perf/**) are isolated into their own
    // SERIAL pass (vitest.perf.config.ts / the `test:perf` script): spawning +
    // timing the compiled binary inside this parallel, coverage-instrumented
    // run measures CPU contention, not the binary, so the ceilings flake red.
    // They stay ENFORCED, just out of this pass. No perf test needs dist/pragma2
    // here, so the binary-building globalSetup lives only in the perf config.
    exclude: [...configDefaults.exclude, "src/testing/perf/**"],
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
