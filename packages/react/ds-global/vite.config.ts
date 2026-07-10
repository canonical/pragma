// Testing posture: Measured — Chromatic is primary visual gate; unit tests cover logic
import { reactTestConfig } from "@canonical/vitest-config-react";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // include sourcemaps for easier debugging
    sourcemap: true,
  },
  test: reactTestConfig({
    // Both naming conventions run until the repo-wide unification lands: the
    // `_work_in_progress` scaffolds use `.test.` and were silently excluded
    // by the previous `tests`-only glob (20 files never ran).
    glob: ["test", "tests"],
    ssr: true,
    setupFiles: ["./vitest.setup.ts"],
  }),
});
