import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // use JS DOM for browser-like test environment
      environment: "jsdom",
      // include vite globals for terser test code
      globals: true,
      // extend matchers and clean up the DOM after each test
      setupFiles: ["./vitest.setup.ts"],
      include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
    },
  }),
);
