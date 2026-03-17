import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
    },
  },
});
