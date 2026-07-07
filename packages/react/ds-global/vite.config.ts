// Testing posture: Measured — Chromatic is primary visual gate; unit tests cover logic
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
  test: {
    projects: [
      {
        test: {
          name: "client",
          // use JS DOM for browser-like test environment
          environment: "jsdom",
          // include vite globals for terser test code
          globals: true,
          // Defines files that perform extra vitest configuration
          // Currently, this is used to extend vitest matchers and cleanup the DOM after each test
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
          exclude: ["src/**/*.ssr.tests.tsx"],
        },
      },
      {
        test: {
          name: "ssr",
          // use Node.js environment for server-side rendering tests
          environment: "node",
          include: ["src/**/*.ssr.tests.tsx"],
        },
      },
    ],
  },
});
