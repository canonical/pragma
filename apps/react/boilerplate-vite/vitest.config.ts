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
        // Thresholds start at 0 — coverage is reported but does not gate.
        // Ratchet these up as the app grows.
        thresholds: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
      },
    },
  }),
);
