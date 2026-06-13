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
      // Coverage thresholds are enforced once the library is fully assembled
      // (see the PR that completes the compiler). Earlier layers in the stack
      // ship partial slices whose untested lines are covered downstream.
    },
  },
});
