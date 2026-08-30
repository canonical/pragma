import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // ⚠ `*.test.ts`, NOT `*.tests.ts`. The docsite app uses the plural form;
    // this package (like every other package in the repo) uses the singular.
    // A file ported from the app keeping its `.tests.ts` name is collected by
    // NOTHING and the suite goes green with fewer tests, silently.
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/*.test.ts",
        "**/*.d.ts",
        "**/types.ts",
        "**/constants.ts",
        "src/testing/**",
      ],
      // The repo standard for a shipped package: 100%, matching the sibling
      // contract and graph-example packages. Do not lower these — the
      // provider that backs the docsite cannot hold a lower bar than the
      // reference implementation it is measured against.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
