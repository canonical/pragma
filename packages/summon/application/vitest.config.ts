import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Worker reuse across files; the per-file fork respawn is pure overhead.
    isolate: false,
  },
});
