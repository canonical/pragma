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
        "src/testing/**",
        "src/http/graphiqlHtml.ts",
      ],
      thresholds: {
        statements: 87,
        branches: 71,
        functions: 88,
        lines: 87,
      },
    },
  },
});
