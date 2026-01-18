/// <reference types="vitest/config" />

import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    process.env.VITEST
      ? svelte({
          configFile: false,
          preprocess: vitePreprocess(),
        })
      : null,
  ].filter(Boolean),
  build: {
    sourcemap: true,
  },
});
