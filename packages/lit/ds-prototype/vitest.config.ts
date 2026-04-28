// Testing posture: Measured — prototype package, Chromatic is primary gate
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "happy-dom",
      include: ["src/**/*.tests.ts"],
    },
  }),
);
