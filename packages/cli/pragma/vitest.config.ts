import type { ViteUserConfig } from "vitest/config";
import { configDefaults, defineConfig } from "vitest/config";

/** The `test` block of a Vitest config, as consumed by `defineConfig({ test })`. */
type TestConfig = NonNullable<ViteUserConfig["test"]>;

/**
 * The six files that hoist `vi.mock(...)` over modules the rest of the suite
 * imports (`pragma.conf.js`, `loadSession.js`, `ke`, `ke-graphql`,
 * `shared/index.js`).
 *
 * A worker shared across files keeps its module registry, and a hoisted mock
 * cannot replace a module another file in the worker already evaluated — so
 * these six must run with per-file isolation while every other file reuses
 * its worker. They get their own project; the list is the single source for
 * BOTH projects (the reuse project excludes exactly these paths, the
 * isolation project includes exactly these paths), so a file can never be
 * matched by both or dropped by both.
 */
const MOCK_HEAVY_FILES = [
  "src/identity.test.ts",
  "src/kernel/runtime/store.test.ts",
  "src/kernel/runtime/facade.test.ts",
  "src/kernel/completion/safety.test.ts",
  "src/capabilities/info/info.test.ts",
  "src/capabilities/upgrade/upgrade.test.ts",
] as const;

/**
 * What every project in this config shares. Inline projects do NOT inherit
 * the root config's test options, so this is spread into each one rather
 * than written once — globalSetup included: both projects' workers spawn the
 * shipped entry and allocate inside the run root, so both need the emit
 * gate, the run-level temp root (which is REFCOUNTED for exactly this
 * two-holder case), and the shared-cache seed.
 */
const SHARED_TEST_OPTIONS: TestConfig = {
  globals: true,
  environment: "node",
  maxWorkers: "50%",
  globalSetup: [
    "./src/testing/perf/globalSetup.ts",
    "./src/testing/tempRoot.globalSetup.ts",
    "./src/testing/sharedCacheSeed.globalSetup.ts",
  ],
  setupFiles: [
    "./src/testing/setupXdgIsolation.ts",
    "./src/testing/setupCallChecking.ts",
  ],
};

export default defineConfig({
  test: {
    // The perf-budget TIMING tests (src/testing/perf/**) are isolated into their
    // own SERIAL pass (vitest.perf.config.ts / the `test:perf` script): spawning +
    // timing the shipped entry inside this parallel, coverage-instrumented run
    // measures CPU contention, not the binary, so the ceilings flake red. They
    // stay ENFORCED, just out of this pass.
    //
    // safety.test.ts's storeless-guarantee guards spawn the shipped entry
    // — a correctness check (exit/stdout), not a timing one, so it belongs in
    // this pass. The perf suite's globalSetup provisions the emit once if
    // missing so a clean `test:vitest` doesn't fail with a null exit status.
    projects: [
      {
        test: {
          name: "reused",
          ...SHARED_TEST_OPTIONS,
          // Worker reuse across test files: the per-file fork respawn is pure
          // overhead this suite paid ~170 times per run. Subprocess-spawning
          // tests are unaffected (they fork their own children), and the
          // per-file setup files — XDG isolation included — still re-run per
          // file.
          isolate: false,
          include: ["src/**/*.test.ts"],
          exclude: [
            ...configDefaults.exclude,
            "src/testing/perf/**",
            ...MOCK_HEAVY_FILES,
          ],
        },
      },
      {
        test: {
          name: "isolated",
          ...SHARED_TEST_OPTIONS,
          // Per-file isolation for the hoisted-mock files (see
          // MOCK_HEAVY_FILES). The same maxWorkers as the reuse project keeps
          // both in one scheduling group — vitest refuses two projects that
          // share a group order but disagree on the worker cap.
          isolate: true,
          include: [...MOCK_HEAVY_FILES],
        },
      },
    ],
    // Coverage is a ROOT-level option: with projects, the results are merged
    // across both and these thresholds gate the one merged report.
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
        // The embedded pack's generated modules are DATA, not logic: an
        // 11.4 MB n-quads payload inlined as a string literal (~5 statements
        // across four files) that the shared-cache seed keeps out of the
        // workers entirely. Counting them made the v8 report parse and remap
        // 13 MB of generated text per run for no measurement it can use.
        "src/kernel/runtime/graphpack/embedded/**",
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
