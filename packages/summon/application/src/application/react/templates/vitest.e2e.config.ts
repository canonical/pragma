import { defineConfig } from "vitest/config";

// E2e build/server tests: boot each package.json server script and assert it
// serves over HTTP. Separate from the default unit suite (vitest.config.ts) —
// node environment, serial (servers bind ports), and a long timeout because
// `preview:*` builds the client + compiles the renderer before serving.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.e2e.ts"],
    // Servers bind real ports and the preview build is heavy — run serially.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
