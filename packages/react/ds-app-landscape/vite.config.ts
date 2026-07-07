// Testing posture: Measured — Chromatic is primary visual gate
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
    glob: "tests",
    setupFiles: ["./vitest.setup.ts"],
  }),
});
