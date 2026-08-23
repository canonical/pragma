// Testing posture: Measured — coverage tracked, no enforced threshold yet
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // The subprocess suites spawn `bun src/bin.tsx`, which executes
    // summon-core's and task's BUILT dists (exports-map resolution + the
    // fixtures' hard-coded dist entries). The gate rebuilds stale dep dists
    // once, in the main process, before any worker — cli/pragma's dep-dist
    // gate, adapted (see the file's docblock for why it is a sibling, not
    // an import).
    globalSetup: ["./src/testing/globalSetup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "**/index.ts",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        // Test infrastructure (the globalSetup gate) — runs in the main
        // process, outside any measurable worker.
        "src/testing/**",
      ],
    },
  },
});
