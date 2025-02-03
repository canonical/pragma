import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  // Base the test config on the base vite config
  viteConfig,
  defineConfig({
    test: {
      // use JS DOM for browser-like test environment
      environment: "jsdom",
      // include vite globals for terser test code
      globals: true,
      // Defines files that perform extra vitest configuration
      // Currently, this is used to extend vitest matchers and cleanup the DOM after each test
      setupFiles: ["./vitest.setup.ts"],
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
  }),
);
