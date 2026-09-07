// Testing posture: Measured — coverage tracked, no enforced threshold yet
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The subject is another package's CSS, read from disk. There is nothing to
    // build and nothing to render: every assertion resolves an entry point's
    // `@import` graph and inspects the text.
    include: ["tests/**/*.test.ts"],
  },
});
