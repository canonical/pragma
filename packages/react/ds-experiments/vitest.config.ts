// Testing posture: Measured — Chromatic is the primary visual gate for the
// graph canvas and its nodes/edges (they measure the DOM through React Flow,
// which jsdom cannot fully reproduce), so unit tests here cover the
// deterministic logic — the appearance resolvers, the element builder, the
// layout — and the pure presentational component (GraphLegend).
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          test: {
            name: "client",
            // browser-like environment for component tests
            environment: "jsdom",
            // vite globals for terser test code
            globals: true,
            // extend matchers and clean up the DOM after each test
            setupFiles: ["./vitest.setup.ts"],
            include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
            exclude: ["src/**/*.ssr.tests.tsx"],
          },
        },
        {
          test: {
            name: "ssr",
            // Node environment for server-side rendering tests
            environment: "node",
            include: ["src/**/*.ssr.tests.tsx"],
          },
        },
      ],
    },
  }),
);
