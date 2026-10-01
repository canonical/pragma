// Testing posture: Measured — asset package with minimal logic surface
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      include: ["src/**/*.test.ts"],
      // Worker reuse across files; the per-file fork respawn is pure overhead.
      isolate: false,
    },
  }),
);
