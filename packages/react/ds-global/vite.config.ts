// Testing posture: Measured — Chromatic is primary visual gate; unit tests cover logic
import { reactTestConfig } from "@canonical/vitest-config-react";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // Resolve the `#lib/*` self-imports against `src` in dev/build/test by
    // selecting the `development` condition of the package `imports` map (see
    // pragma-adrs N.05 CS.IMPORTS.1). Without this, the bundler falls through to
    // the `default` condition (`./dist/esm/lib/*`), which only exists after a
    // package build — breaking Storybook/Vitest against live source.
    conditions: ["development", "import", "module", "browser", "default"],
  },
  build: {
    // include sourcemaps for easier debugging
    sourcemap: true,
  },
  test: reactTestConfig({
    glob: "tests",
    ssr: true,
    setupFiles: ["./vitest.setup.ts"],
  }),
});
