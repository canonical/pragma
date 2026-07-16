import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const TIME_ZONE = "America/Los_Angeles";

export default defineConfig({
  plugins: [svelte({})],
  test: {
    environment: "node",
    env: {
      TZ: TIME_ZONE,
    },
    include: ["src/**/*.tests.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "client",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              contextOptions: {
                timezoneId: TIME_ZONE,
              },
            }),
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
        extends: true,
        test: {
          name: "ssr",
          environment: "node",
          include: ["src/**/*.ssr.test.{js,ts}"],
        },
      },
      {
        extends: true,
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
