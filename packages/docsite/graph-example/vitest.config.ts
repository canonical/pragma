import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
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
      // contract package (packages/docsite/contract/vitest.config.ts). Do not
      // lower these — a reference implementation that cannot hold its own bar
      // is not a reference.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
