/// <reference types="vitest/config" />

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [process.env.VITEST ? svelte() : null].filter(Boolean),
  build: {
    sourcemap: true,
  },
});
