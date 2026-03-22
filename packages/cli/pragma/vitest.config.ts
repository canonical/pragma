import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "testing/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/*.test.ts",
        "**/*.d.ts",
        "**/compile-validation*.ts",
      ],
    },
  },
});
