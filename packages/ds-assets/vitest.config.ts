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
            include: ["src/**/*.test.ts"],
          },
        },
      ],
    },
  }),
);
