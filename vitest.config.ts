import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json", "html", "lcov"],
      exclude: [
        "**/{index,types}.ts",
        "**/*.tests.[jt]s?(x)",
        "**/*.stories.ts?(x)",
        "**/*.d.ts",
        "**/*.gen.ts"
      ],
      include: ["**/src/**/*.[jt]s?(x)"],
      reportOnFailure: true
    },
    projects: [
      "{apps,configs,packages}/**/*/vitest.config.ts"
    ],
    globals: true,
  },
});