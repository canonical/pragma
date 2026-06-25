// Testing posture: Measured — Chromatic is primary visual gate; unit tests cover logic
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          resolve: {
            conditions: ["browser"],
          },
          test: {
            name: "client",
            environment: "jsdom",
            globals: true,
            setupFiles: ["./vitest.setup.ts"],
            include: ["src/**/*.svelte.test.ts"],
          },
        },
        {
          extends: true,
          test: {
            name: "ssr",
            environment: "node",
            include: ["src/**/*.ssr.test.ts"],
          },
        },
      ],
    },
  }),
);
