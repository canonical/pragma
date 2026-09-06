// Testing posture: Measured — coverage tracked, no enforced threshold yet
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The package ships CSS; the tests are about how the entry points relate to
    // one another, so they read the files rather than a built artefact and live
    // outside `src`, which is what npm publishes.
    include: ["tests/**/*.test.ts"],
  },
});
