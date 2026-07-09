/**
 * Storybook addon preset — configures Vite so that `relay-test-utils`
 * (a CJS-only package) is pre-bundled, allowing its named exports
 * (`createMockEnvironment`, `MockPayloadGenerator`) to work in
 * the browser ESM context.
 *
 * @note Named `viteFinal` per Storybook preset API convention — not a
 * verb-first function name by design.
 */
export const viteFinal = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const optimizeDeps = (config.optimizeDeps ?? {}) as Record<string, unknown>;
  const include = (optimizeDeps.include ?? []) as string[];

  if (!include.includes("relay-test-utils")) {
    include.push("relay-test-utils");
  }

  optimizeDeps.include = include;
  config.optimizeDeps = optimizeDeps;

  return config;
};
