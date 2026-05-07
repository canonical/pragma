import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte({})],
  test: {
    environment: "node",
    env: {
      TZ: "America/Los_Angeles",
    },
    include: ["src/**/*.tests.ts"],
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
          include: ["src/**/*.svelte.test.{js,ts}"],
          exclude: ["src/lib/server/**"],
          setupFiles: ["./vitest-setup-client.ts"],
        },
      },
      {
        extends: "./vite.config.ts",
        test: {
          name: "ssr",
          environment: "node",
          include: ["src/**/*.ssr.test.{js,ts}"],
        },
      },
      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.test.{js,ts}"],
          exclude: [
            "src/**/*.svelte.test.{js,ts}",
            "src/**/*.ssr.test.{js,ts}",
          ],
        },
      },
    ],
  },
});
