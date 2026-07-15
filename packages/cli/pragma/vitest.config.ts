import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/testing/setupXdgIsolation.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
      include: ["src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/*.test.ts",
        "**/*.d.ts",
        "**/compile-validation*.ts",
        "src/testing/**",
      ],
    },
  },
});
