import type { PluginOption } from "vite";
import type { ViteUserConfig } from "vitest/config";

/** The `test` block of a Vitest config, as consumed by `defineConfig({ test })`. */
type TestConfig = NonNullable<ViteUserConfig["test"]>;

/**
 * Vitest's coverage options. Derived from the public `test` type rather than
 * importing the internal `CoverageV8Options` name, which `vitest/config` does
 * not re-export.
 */
type CoverageConfig = NonNullable<TestConfig["coverage"]>;

/**
 * The two test-file glob conventions in use across the React packages. This is
 * a REQUIRED option with no default: `.test.` and `.tests.` are load-bearing
 * (each package uses exactly one), and a wrong choice silently matches zero
 * files — a green run that ran nothing. See pragma-adrs (Track: unified config).
 */
export type TestGlob = "test" | "tests";

/** Coverage options. `true` enables v8 coverage with 100% thresholds. */
export type CoverageOption =
  | boolean
  | {
      /** Threshold overrides; each defaults to 100 when coverage is enabled. */
      thresholds?: Partial<
        Record<"branches" | "functions" | "lines" | "statements", number>
      >;
      /** Extra `coverage.include` globs (defaults to `src/**` for the runtime). */
      include?: string[];
      /** Extra `coverage.exclude` globs, merged after the standard excludes. */
      exclude?: string[];
    };

export interface ReactTestConfigOptions {
  /**
   * Test-file glob convention. REQUIRED — no default; see {@link TestGlob}.
   */
  glob: TestGlob;
  /**
   * Test environment. `"jsdom"` (default) for DOM component tests, `"node"`
   * for framework-agnostic / SSR-only packages.
   *
   * @note jsdom is the interim environment. The forward path is Vitest browser
   * mode with Playwright (see the svelte-ds-global migration); this factory
   * will gain a `browser` option to drive that per-package flip without a
   * config rewrite.
   */
  environment?: "jsdom" | "node";
  /**
   * When true, adds a second `node`-environment project that runs
   * `**\/*.ssr.<glob>.tsx` files (client project excludes them). Mirrors the
   * client/ssr split used by ds-global, hooks, head, router and tokens.
   */
  ssr?: boolean;
  /**
   * v8 coverage. `false` (default) attaches no coverage block — preserving the
   * behaviour of packages that do not currently gate coverage. `true` enables
   * coverage with 100/100/100/100 thresholds. Pass an object to override
   * thresholds/include/exclude while keeping the 100% defaults for any omitted
   * threshold.
   */
  coverage?: CoverageOption;
  /** Setup files (e.g. `["./vitest.setup.ts"]`); omitted when empty. */
  setupFiles?: string[];
  /**
   * Vite plugins to attach to each project. Vitest resolves plugins per
   * project, so packages with a split pass their `[react()]` here.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Vite 8 plugin types are incompatible with vitest's Vite 7 re-exports (matches per-package configs).
  plugins?: any[] | PluginOption[];
}

/** Standard coverage excludes shared by every coverage-gated package. */
const BASE_COVERAGE_EXCLUDE = [
  "**/index.ts",
  "**/*.d.ts",
  "**/types.ts",
] as const;

const FULL_THRESHOLDS = {
  branches: 100,
  functions: 100,
  lines: 100,
  statements: 100,
} as const;

/**
 * Build the v8 coverage block. Test files are always excluded (both `.test.`
 * and `.tests.` plus their `.ssr.` variants) so coverage measures runtime code
 * only. Thresholds default to 100% and are overridable per the storybook-config
 * convention of "sensible defaults you pass through".
 */
const buildCoverage = (
  coverage: Exclude<CoverageOption, false>,
  glob: TestGlob,
): CoverageConfig => {
  const overrides = coverage === true ? {} : coverage;
  const testExclude = [
    `**/*.${glob}.ts`,
    `**/*.${glob}.tsx`,
    `**/*.ssr.${glob}.ts`,
    `**/*.ssr.${glob}.tsx`,
  ];
  return {
    provider: "v8",
    include: overrides.include ?? ["src/**/*.{ts,tsx}"],
    exclude: [
      ...BASE_COVERAGE_EXCLUDE,
      ...testExclude,
      ...(overrides.exclude ?? []),
    ],
    thresholds: { ...FULL_THRESHOLDS, ...overrides.thresholds },
  };
};

/**
 * Canonical's standard Vitest `test` configuration for React packages.
 *
 * Returns the `test` block to spread into `defineConfig` from `vitest/config`.
 * Every distinct React vitest posture in the monorepo is a point in this
 * option space — DOM-plain, DOM+SSR split, coverage-gated, and node-only — so
 * there is a single factory rather than per-shape variants.
 *
 * `import { reactTestConfig } from "@canonical/vitest-config-react";`
 *
 * @example jsdom component package (ds-app family)
 * ```ts
 * test: reactTestConfig({ glob: "tests", setupFiles: ["./vitest.setup.ts"] })
 * ```
 * @example client + ssr split with 100% coverage (hooks, router)
 * ```ts
 * test: reactTestConfig({ glob: "test", ssr: true, coverage: true, plugins, setupFiles: ["./vitest.setup.ts"] })
 * ```
 * @example node-only adapter with overridden coverage include
 * ```ts
 * test: reactTestConfig({ glob: "tests", environment: "node", coverage: { include: ["src/lib/**\/*.ts"] } })
 * ```
 */
export const reactTestConfig = ({
  glob,
  environment = "jsdom",
  ssr = false,
  coverage = false,
  setupFiles,
  plugins,
}: ReactTestConfigOptions): TestConfig => {
  const hasSetup = setupFiles !== undefined && setupFiles.length > 0;

  // The client project: DOM (or node) tests, excluding the `.ssr.` variants
  // when an ssr project will pick them up.
  const clientTest: TestConfig = {
    name: "client",
    environment,
    globals: true,
    ...(hasSetup ? { setupFiles } : {}),
    include: [`src/**/*.${glob}.ts`, `src/**/*.${glob}.tsx`],
    ...(ssr ? { exclude: [`src/**/*.ssr.${glob}.tsx`] } : {}),
  };

  const coverageBlock =
    coverage === false ? {} : { coverage: buildCoverage(coverage, glob) };

  // No split: return a flat single-project test block (the common case).
  if (!ssr) {
    // The client project's identity (`name`) is only meaningful in a split, so
    // a flat config omits it to match the hand-written single-project shape.
    const { name: _name, ...flat } = clientTest;
    return { ...flat, ...coverageBlock };
  }

  // Split: a jsdom/node client project plus a node ssr project that runs only
  // the `.ssr.` files.
  const ssrTest: TestConfig = {
    name: "ssr",
    environment: "node",
    include: [`src/**/*.ssr.${glob}.tsx`],
  };

  return {
    ...coverageBlock,
    projects: [
      { ...(plugins ? { plugins } : {}), test: clientTest },
      { ...(plugins ? { plugins } : {}), test: ssrTest },
    ],
  };
};
