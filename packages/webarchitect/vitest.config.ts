// Testing posture: Enforced — critical infrastructure
// Lines: 100%. Branches/functions/statements: ~97% due to v8 ignore pragmas
// on fs permission error paths (EACCES) that require root-level fs mocking.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
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
        branches: 95,
        functions: 95,
        lines: 100,
        statements: 99,
      },
    },
  },
});
