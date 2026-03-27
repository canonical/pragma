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
            // include vite globals for terser test code
            globals: true,
            include: ["src/**/*.tests.ts", "src/**/*.test.ts"],
          },
        },
      ],
      coverage: {
        provider: "v8",
        include: ["src/**/*.ts"],
        exclude: ["**/index.ts", "**/*.test.ts", "**/*.tests.ts", "**/*.d.ts"],
      },
    },
  }),
);
