import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

// `vite.config` is a config function (it branches on `--mode server` for the
// SSR build); resolve it for the default test run before merging.
export default mergeConfig(
  viteConfig({ command: "serve", mode: "test" }),
  defineConfig({
    test: {
      // Browser-like environment for component tests
      environment: "jsdom",
      // Vitest globals (describe/it/expect) without imports
      globals: true,
      // Extend matchers and clean up the DOM between tests
      setupFiles: ["./vitest.setup.ts"],
      // Repo convention: test files are named *.tests.ts(x)
      include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
      coverage: {
        provider: "v8",
        // The denominator is the SOURCE TREE, not the import graph. Without
        // an explicit `include`, v8 reports only files a test happened to
        // import, so the server entry points — which no unit test imports —
        // were absent from the report entirely and the percentage described a
        // subset of the app rather than the app.
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "**/index.ts",
          "**/*.tests.ts",
          "**/*.tests.tsx",
          "**/*.stories.tsx",
          "**/types.ts",
          "src/relay/__generated__/**",
          "src/vite-env.d.ts",
        ],
        // Set to the measured floor rather than to 0: a threshold of 0 is not
        // a ratchet, it is the absence of one. Raise these as coverage grows;
        // do not lower them.
        thresholds: {
          statements: 84,
          branches: 70,
          functions: 83,
          lines: 85,
        },
      },
    },
  }),
);
