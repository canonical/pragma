import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      include: ["src/**/*.tests.ts"],
      // Worker reuse across files; the per-file fork respawn is pure overhead.
      isolate: false,
    },
  }),
);
