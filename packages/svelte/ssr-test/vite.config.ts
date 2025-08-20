/// <reference types="vitest/config" />
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type PluginOption } from "vite";

export default defineConfig({
  plugins: [svelte() as PluginOption],
  build: {
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.tests.ts"],
  },
});
