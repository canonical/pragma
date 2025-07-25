import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  // Base the test config on the base vite config
  viteConfig,
  defineConfig({
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
  }),
);
