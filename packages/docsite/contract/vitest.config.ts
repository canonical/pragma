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
        "src/__fixtures__/**",
      ],
      // Thresholds start at 40% — the repo standard for a shipped package is
      // 100%. This is a deliberate, temporary deviation for a NEW package.
      // Ratchet these up as the package grows; do not lower them.
      thresholds: {
        statements: 40,
        branches: 40,
        functions: 40,
        lines: 40,
      },
    },
  },
});
