import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()],
  test: {
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "client",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              { browser: "chromium" },
              { browser: "firefox" },
              { browser: "webkit" },
            ],
          },
          include: ["src/**/*.svelte.test.ts"],
          setupFiles: ["./vitest-setup-client.ts"],
        },
      },
      {
        extends: "./vite.config.ts",
        test: {
          name: "ssr",
          environment: "node",
          include: ["src/**/*.ssr.test.ts"],
        },
      },
    ],
  },
});
