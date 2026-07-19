import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "**/types.ts",
        "**/types/*.ts",
        "**/TemplatingEngine.ts",
        // The Ink render boundary: the lazy-import factory + the React mount.
        // Its dynamic-import discipline is asserted by the lazy-React guard and
        // its UX by the ink-testing-library wizard flow; the JSX views are
        // outside the `.ts` coverage include already.
        "**/prompt/inkPrompt.ts",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
