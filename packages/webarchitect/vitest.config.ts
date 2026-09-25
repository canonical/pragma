// Testing posture: Enforced — critical infrastructure, 100% coverage
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Isolation is load-bearing here: the suites mock the filesystem and an
    // internal module (node:fs/promises, node:fs, ./ajv.js) to drive error
    // paths, and a hoisted mock cannot replace a module another file in a
    // shared worker already evaluated.
    isolate: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/*.test.ts",
        "**/*.d.ts",
        "**/types.ts",
        "**/cli.ts",
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
